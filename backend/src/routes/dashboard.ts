import { Router } from "express";
import { authenticateToken, enforceBaseScope } from "../middleware/auth";
import { parseOptionalDate, endOfDay, startOfDay } from "../lib/http";
import {
  balanceSheet,
  holdings,
  netMovementBreakdown,
  personnelHoldings,
  LedgerScope,
} from "../services/inventory";
import { prisma } from "../lib/prisma";

export const dashboardRouter = Router();

dashboardRouter.use(authenticateToken, enforceBaseScope);

function scopeFrom(req: { scopedBaseId?: string | null; query: Record<string, unknown> }): LedgerScope {
  const start = parseOptionalDate(req.query.startDate);
  const end = parseOptionalDate(req.query.endDate);
  return {
    baseId: req.scopedBaseId,
    equipmentTypeId: typeof req.query.equipmentTypeId === "string" ? req.query.equipmentTypeId : null,
    startDate: start ? startOfDay(start) : undefined,
    endDate: end ? endOfDay(end) : undefined,
  };
}

dashboardRouter.get("/summary", async (req, res, next) => {
  try {
    const scope = scopeFrom(req);
    const sheet = await balanceSheet(prisma, scope);
    res.json({ summary: sheet, scope: serializeScope(scope) });
  } catch (err) {
    next(err);
  }
});

dashboardRouter.get("/holdings", async (req, res, next) => {
  try {
    const scope = scopeFrom(req);
    const rows = await holdings(scope);
    res.json({ holdings: rows });
  } catch (err) {
    next(err);
  }
});

dashboardRouter.get("/personnel-holdings", async (req, res, next) => {
  try {
    const scope = scopeFrom(req);
    const rows = await personnelHoldings(scope);
    res.json({ assignments: rows });
  } catch (err) {
    next(err);
  }
});

dashboardRouter.get("/net-movement", async (req, res, next) => {
  try {
    const scope = scopeFrom(req);
    const breakdown = await netMovementBreakdown(scope);
    res.json({ breakdown, scope: serializeScope(scope) });
  } catch (err) {
    next(err);
  }
});

function serializeScope(scope: LedgerScope) {
  return {
    baseId: scope.baseId ?? null,
    equipmentTypeId: scope.equipmentTypeId ?? null,
    startDate: scope.startDate ?? null,
    endDate: scope.endDate ?? null,
  };
}
