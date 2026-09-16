import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/http";

type Db = PrismaClient | Prisma.TransactionClient;

export type DateWindow = {
  startDate?: Date;
  endDate?: Date;
};

export type LedgerScope = DateWindow & {
  baseId?: string | null;
  equipmentTypeId?: string | null;
};

export type MovementTotals = {
  purchases: number;
  transfersIn: number;
  transfersOut: number;
  assigned: number;
  expended: number;
  netMovement: number;
};

export type BalanceSheet = MovementTotals & {
  opening: number;
  closing: number;
};

function qty(value: number | null | undefined): number {
  return value ?? 0;
}

function dateClause(
  field: "purchasedAt" | "transferredAt" | "assignedAt" | "expendedAt",
  window: DateWindow,
  bound: "before" | "during"
): Record<string, Date> {
  const clause: Record<string, Date> = {};
  if (bound === "before") {
    if (window.startDate) clause.lt = window.startDate;
    else {
      // No start filter means there is no "before" activity to count as opening.
      clause.lt = new Date(0);
    }
    return clause;
  }
  if (window.startDate) clause.gte = window.startDate;
  if (window.endDate) clause.lte = window.endDate;
  return clause;
}

async function sumPurchases(db: Db, scope: LedgerScope, bound: "before" | "during"): Promise<number> {
  const result = await db.purchase.aggregate({
    _sum: { quantity: true },
    where: {
      baseId: scope.baseId ?? undefined,
      equipmentTypeId: scope.equipmentTypeId ?? undefined,
      purchasedAt: dateClause("purchasedAt", scope, bound),
    },
  });
  return qty(result._sum.quantity);
}

async function sumTransfersIn(db: Db, scope: LedgerScope, bound: "before" | "during"): Promise<number> {
  const result = await db.transfer.aggregate({
    _sum: { quantity: true },
    where: {
      toBaseId: scope.baseId ?? undefined,
      equipmentTypeId: scope.equipmentTypeId ?? undefined,
      transferredAt: dateClause("transferredAt", scope, bound),
    },
  });
  return qty(result._sum.quantity);
}

async function sumTransfersOut(db: Db, scope: LedgerScope, bound: "before" | "during"): Promise<number> {
  const result = await db.transfer.aggregate({
    _sum: { quantity: true },
    where: {
      fromBaseId: scope.baseId ?? undefined,
      equipmentTypeId: scope.equipmentTypeId ?? undefined,
      transferredAt: dateClause("transferredAt", scope, bound),
    },
  });
  return qty(result._sum.quantity);
}

async function sumAssigned(db: Db, scope: LedgerScope, bound: "before" | "during"): Promise<number> {
  const result = await db.assignment.aggregate({
    _sum: { quantity: true },
    where: {
      baseId: scope.baseId ?? undefined,
      equipmentTypeId: scope.equipmentTypeId ?? undefined,
      assignedAt: dateClause("assignedAt", scope, bound),
    },
  });
  return qty(result._sum.quantity);
}

async function sumExpended(db: Db, scope: LedgerScope, bound: "before" | "during"): Promise<number> {
  const result = await db.expenditure.aggregate({
    _sum: { quantity: true },
    where: {
      expendedAt: dateClause("expendedAt", scope, bound),
      assignment: {
        baseId: scope.baseId ?? undefined,
        equipmentTypeId: scope.equipmentTypeId ?? undefined,
      },
    },
  });
  return qty(result._sum.quantity);
}

export async function movementTotals(
  db: Db,
  scope: LedgerScope,
  bound: "before" | "during"
): Promise<MovementTotals> {
  const [purchases, transfersIn, transfersOut, assigned, expended] = await Promise.all([
    sumPurchases(db, scope, bound),
    sumTransfersIn(db, scope, bound),
    sumTransfersOut(db, scope, bound),
    sumAssigned(db, scope, bound),
    sumExpended(db, scope, bound),
  ]);

  return {
    purchases,
    transfersIn,
    transfersOut,
    assigned,
    expended,
    netMovement: purchases + transfersIn - transfersOut,
  };
}

/**
 * Closing = Opening + NetMovement - Assigned - Expended
 * Opening is the same formula applied to every ledger row strictly before startDate.
 */
export async function balanceSheet(db: Db, scope: LedgerScope): Promise<BalanceSheet> {
  const [prior, period] = await Promise.all([
    movementTotals(db, scope, "before"),
    movementTotals(db, scope, "during"),
  ]);

  const opening =
    prior.netMovement - prior.assigned - prior.expended;
  const closing = opening + period.netMovement - period.assigned - period.expended;

  return { ...period, opening, closing };
}

export async function availableAtBase(
  db: Db,
  baseId: string,
  equipmentTypeId: string,
  asOf?: Date
): Promise<number> {
  // Armory stock is everything received minus everything already issued to people.
  // Expenditures reduce assigned remaining, not armory stock (the issue already left the cage).
  const scope: LedgerScope = {
    baseId,
    equipmentTypeId,
    endDate: asOf,
  };
  const [purchases, transfersIn, transfersOut, assigned] = await Promise.all([
    sumPurchases(db, scope, "during"),
    sumTransfersIn(db, scope, "during"),
    sumTransfersOut(db, scope, "during"),
    sumAssigned(db, scope, "during"),
  ]);
  return purchases + transfersIn - transfersOut - assigned;
}

function lockKeys(baseId: string, equipmentTypeId: string): { a: number; b: number } {
  // Two 32-bit keys keep concurrent transfers of the same base+type from racing.
  const a = Math.abs(hash32(baseId)) % 2147483647;
  const b = Math.abs(hash32(equipmentTypeId)) % 2147483647;
  return { a: a || 1, b: b || 1 };
}

function hash32(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return h;
}

export async function withStockLock<T>(
  baseId: string,
  equipmentTypeId: string,
  work: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const { a, b } = lockKeys(baseId, equipmentTypeId);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${a}, ${b})`;
    return work(tx);
  });
}

export async function assertAvailable(
  db: Db,
  baseId: string,
  equipmentTypeId: string,
  needed: number
) {
  const available = await availableAtBase(db, baseId, equipmentTypeId);
  if (available < needed) {
    throw new HttpError(
      409,
      `Insufficient unassigned stock: ${available} available, ${needed} requested`
    );
  }
}

export async function remainingOnAssignment(db: Db, assignmentId: string): Promise<number> {
  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    include: { expenditures: true },
  });
  if (!assignment) {
    throw new HttpError(404, "Assignment not found");
  }
  const used = assignment.expenditures.reduce((sum, row) => sum + row.quantity, 0);
  return assignment.quantity - used;
}

export type HoldingRow = {
  equipmentTypeId: string;
  name: string;
  category: string;
  unit: string;
  received: number;
  available: number;
  assigned: number;
  assignedRemaining: number;
  expended: number;
  baseId: string;
  baseName: string;
  baseCode: string;
};

export async function holdings(scope: LedgerScope): Promise<HoldingRow[]> {
  const types = await prisma.equipmentType.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  const bases = await prisma.base.findMany({
    where: scope.baseId ? { id: scope.baseId } : undefined,
    orderBy: { name: "asc" },
  });

  const rows: HoldingRow[] = [];

  for (const base of bases) {
    for (const type of types) {
      if (scope.equipmentTypeId && type.id !== scope.equipmentTypeId) continue;
      const typeScope: LedgerScope = {
        ...scope,
        baseId: base.id,
        equipmentTypeId: type.id,
        startDate: undefined,
      };
      // Holdings are a current snapshot as of endDate (or now), not a period delta.
      const asOfScope: LedgerScope = {
        baseId: base.id,
        equipmentTypeId: type.id,
        endDate: scope.endDate,
      };
      const [purchases, transfersIn, transfersOut, assigned, expended] = await Promise.all([
        sumPurchases(prisma, asOfScope, "during"),
        sumTransfersIn(prisma, asOfScope, "during"),
        sumTransfersOut(prisma, asOfScope, "during"),
        sumAssigned(prisma, asOfScope, "during"),
        sumExpended(prisma, asOfScope, "during"),
      ]);
      const received = purchases + transfersIn - transfersOut;
      if (received === 0 && assigned === 0 && expended === 0) continue;

      rows.push({
        equipmentTypeId: type.id,
        name: type.name,
        category: type.category,
        unit: type.unit,
        received,
        available: received - assigned,
        assigned,
        assignedRemaining: assigned - expended,
        expended,
        baseId: base.id,
        baseName: base.name,
        baseCode: base.code,
      });
    }
  }

  return rows;
}

export async function personnelHoldings(scope: LedgerScope) {
  const assignments = await prisma.assignment.findMany({
    where: {
      baseId: scope.baseId ?? undefined,
      equipmentTypeId: scope.equipmentTypeId ?? undefined,
      assignedAt: scope.endDate ? { lte: scope.endDate } : undefined,
    },
    include: {
      personnel: true,
      equipmentType: true,
      base: true,
      expenditures: {
        where: scope.endDate ? { expendedAt: { lte: scope.endDate } } : undefined,
      },
    },
    orderBy: [{ assignedAt: "desc" }],
  });

  return assignments.map((row) => {
    const expended = row.expenditures.reduce((sum, item) => sum + item.quantity, 0);
    return {
      assignmentId: row.id,
      personnelId: row.personnelId,
      personnelName: row.personnel.fullName,
      rank: row.personnel.rank,
      serviceNumber: row.personnel.serviceNumber,
      equipmentTypeId: row.equipmentTypeId,
      equipmentName: row.equipmentType.name,
      category: row.equipmentType.category,
      unit: row.equipmentType.unit,
      assignedQty: row.quantity,
      expended,
      remaining: row.quantity - expended,
      assignedAt: row.assignedAt,
      notes: row.notes,
      baseId: row.baseId,
      baseName: row.base.name,
    };
  });
}

export async function netMovementBreakdown(scope: LedgerScope) {
  const purchaseWhere = {
    baseId: scope.baseId ?? undefined,
    equipmentTypeId: scope.equipmentTypeId ?? undefined,
    purchasedAt: dateClause("purchasedAt", scope, "during"),
  };
  const inWhere = {
    toBaseId: scope.baseId ?? undefined,
    equipmentTypeId: scope.equipmentTypeId ?? undefined,
    transferredAt: dateClause("transferredAt", scope, "during"),
  };
  const outWhere = {
    fromBaseId: scope.baseId ?? undefined,
    equipmentTypeId: scope.equipmentTypeId ?? undefined,
    transferredAt: dateClause("transferredAt", scope, "during"),
  };

  const [purchaseRows, inRows, outRows] = await Promise.all([
    prisma.purchase.findMany({
      where: purchaseWhere,
      include: { equipmentType: true, base: true, purchasedBy: { select: { fullName: true, username: true } } },
      orderBy: { purchasedAt: "desc" },
    }),
    prisma.transfer.findMany({
      where: inWhere,
      include: {
        equipmentType: true,
        fromBase: true,
        toBase: true,
        initiatedBy: { select: { fullName: true, username: true } },
      },
      orderBy: { transferredAt: "desc" },
    }),
    prisma.transfer.findMany({
      where: outWhere,
      include: {
        equipmentType: true,
        fromBase: true,
        toBase: true,
        initiatedBy: { select: { fullName: true, username: true } },
      },
      orderBy: { transferredAt: "desc" },
    }),
  ]);

  const purchasesTotal = purchaseRows.reduce((s, r) => s + r.quantity, 0);
  const inTotal = inRows.reduce((s, r) => s + r.quantity, 0);
  const outTotal = outRows.reduce((s, r) => s + r.quantity, 0);

  return {
    purchases: { total: purchasesTotal, rows: purchaseRows },
    transfersIn: { total: inTotal, rows: inRows },
    transfersOut: { total: outTotal, rows: outRows },
    netMovement: purchasesTotal + inTotal - outTotal,
  };
}
