import { Router } from "express";
import { z } from "zod";
import { Prisma, TransferStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticateToken, authorizeRoles, enforceBaseScope } from "../middleware/auth";
import { actorFrom, HttpError, parseOptionalDate } from "../lib/http";
import { assertAvailable, withStockLock } from "../services/inventory";
import { writeAudit } from "../services/audit";

export const transfersRouter = Router();

transfersRouter.use(authenticateToken, enforceBaseScope);

transfersRouter.get("/", async (req, res, next) => {
  try {
    const startDate = parseOptionalDate(req.query.startDate);
    const endDate = parseOptionalDate(req.query.endDate);
    const equipmentTypeId =
      typeof req.query.equipmentTypeId === "string" ? req.query.equipmentTypeId : undefined;
    const status =
      typeof req.query.status === "string" ? (req.query.status as TransferStatus) : undefined;
    const scoped = req.scopedBaseId;

    const transfers = await prisma.transfer.findMany({
      where: {
        equipmentTypeId,
        status,
        transferredAt: { gte: startDate, lte: endDate },
        OR: scoped ? [{ fromBaseId: scoped }, { toBaseId: scoped }] : undefined,
      },
      include: {
        fromBase: true,
        toBase: true,
        equipmentType: true,
        initiatedBy: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { transferredAt: "desc" },
    });
    res.json({ transfers });
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  fromBaseId: z.string().uuid(),
  toBaseId: z.string().uuid(),
  equipmentTypeId: z.string().uuid(),
  quantity: z.number().int().positive(),
  transferredAt: z.string().min(1),
  notes: z.string().max(500).optional(),
  status: z.nativeEnum(TransferStatus).optional().default(TransferStatus.COMPLETED),
});

async function insertTransfer(
  tx: Prisma.TransactionClient,
  data: {
    fromBaseId: string;
    toBaseId: string;
    equipmentTypeId: string;
    quantity: number;
    transferredAt: Date;
    initiatedById: string;
    notes?: string;
    status: TransferStatus;
  }
) {
  return tx.transfer.create({
    data,
    include: { fromBase: true, toBase: true, equipmentType: true },
  });
}

transfersRouter.post(
  "/",
  authorizeRoles("ADMIN", "LOGISTICS_OFFICER"),
  async (req, res, next) => {
    try {
      const actor = actorFrom(req);
      const body = createSchema.parse({
        ...req.body,
        quantity: Number(req.body.quantity),
      });

      const fromBaseId = actor.role === "ADMIN" ? body.fromBaseId : actor.baseId!;
      if (fromBaseId === body.toBaseId) {
        throw new HttpError(400, "Origin and destination bases must differ");
      }

      const transferredAt = new Date(body.transferredAt);
      if (Number.isNaN(transferredAt.getTime())) {
        throw new HttpError(400, "Invalid transferredAt");
      }

      const destination = await prisma.base.findUnique({ where: { id: body.toBaseId } });
      if (!destination) {
        throw new HttpError(400, "Destination base not found");
      }

      const payload = {
        fromBaseId,
        toBaseId: body.toBaseId,
        equipmentTypeId: body.equipmentTypeId,
        quantity: body.quantity,
        transferredAt,
        initiatedById: actor.userId,
        notes: body.notes,
        status: body.status,
      };

      const transfer =
        body.status === TransferStatus.COMPLETED
          ? await withStockLock(fromBaseId, body.equipmentTypeId, async (tx) => {
              await assertAvailable(tx, fromBaseId, body.equipmentTypeId, body.quantity);
              const created = await insertTransfer(tx, payload);
              await writeAudit(tx, {
                userId: actor.userId,
                action: "TRANSFER_COMPLETED",
                entityType: "Transfer",
                entityId: created.id,
                details: {
                  fromBaseId,
                  toBaseId: body.toBaseId,
                  equipmentTypeId: body.equipmentTypeId,
                  quantity: body.quantity,
                  status: created.status,
                },
              });
              return created;
            })
          : await prisma.$transaction(async (tx) => {
              const created = await insertTransfer(tx, payload);
              await writeAudit(tx, {
                userId: actor.userId,
                action: body.status === TransferStatus.IN_TRANSIT ? "TRANSFER_IN_TRANSIT" : "TRANSFER_PENDING",
                entityType: "Transfer",
                entityId: created.id,
                details: {
                  fromBaseId,
                  toBaseId: body.toBaseId,
                  equipmentTypeId: body.equipmentTypeId,
                  quantity: body.quantity,
                  status: created.status,
                },
              });
              return created;
            });

      res.status(201).json({ transfer });
    } catch (err) {
      next(err);
    }
  }
);

const statusSchema = z.object({
  status: z.nativeEnum(TransferStatus),
});

function canAdvance(from: TransferStatus, to: TransferStatus): boolean {
  if (from === to) return false;
  if (from === TransferStatus.COMPLETED) return false;
  if (from === TransferStatus.PENDING) {
    return to === TransferStatus.IN_TRANSIT || to === TransferStatus.COMPLETED;
  }
  if (from === TransferStatus.IN_TRANSIT) {
    return to === TransferStatus.COMPLETED;
  }
  return false;
}

transfersRouter.patch(
  "/:id/status",
  authorizeRoles("ADMIN", "LOGISTICS_OFFICER"),
  async (req, res, next) => {
    try {
      const actor = actorFrom(req);
      const { status } = statusSchema.parse(req.body);
      const existing = await prisma.transfer.findUnique({ where: { id: String(req.params.id) } });
      if (!existing) {
        throw new HttpError(404, "Transfer not found");
      }
      if (actor.role !== "ADMIN" && existing.fromBaseId !== actor.baseId) {
        throw new HttpError(403, "Transfer origin is outside your base");
      }
      if (!canAdvance(existing.status, status)) {
        throw new HttpError(400, `Cannot move transfer from ${existing.status} to ${status}`);
      }

      const transfer =
        status === TransferStatus.COMPLETED
          ? await withStockLock(existing.fromBaseId, existing.equipmentTypeId, async (tx) => {
              await assertAvailable(tx, existing.fromBaseId, existing.equipmentTypeId, existing.quantity);
              const updated = await tx.transfer.update({
                where: { id: existing.id },
                data: { status },
                include: { fromBase: true, toBase: true, equipmentType: true },
              });
              await writeAudit(tx, {
                userId: actor.userId,
                action: "TRANSFER_COMPLETED",
                entityType: "Transfer",
                entityId: updated.id,
                details: { from: existing.status, to: status, quantity: existing.quantity },
              });
              return updated;
            })
          : await prisma.$transaction(async (tx) => {
              const updated = await tx.transfer.update({
                where: { id: existing.id },
                data: { status },
                include: { fromBase: true, toBase: true, equipmentType: true },
              });
              await writeAudit(tx, {
                userId: actor.userId,
                action: "TRANSFER_IN_TRANSIT",
                entityType: "Transfer",
                entityId: updated.id,
                details: { from: existing.status, to: status, quantity: existing.quantity },
              });
              return updated;
            });

      res.json({ transfer });
    } catch (err) {
      next(err);
    }
  }
);
