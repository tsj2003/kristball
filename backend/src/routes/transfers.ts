import { Router } from "express";
import { z } from "zod";
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
    const scoped = req.scopedBaseId;

    const transfers = await prisma.transfer.findMany({
      where: {
        equipmentTypeId,
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
});

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

      const transfer = await withStockLock(fromBaseId, body.equipmentTypeId, async (tx) => {
        await assertAvailable(tx, fromBaseId, body.equipmentTypeId, body.quantity);
        const created = await tx.transfer.create({
          data: {
            fromBaseId,
            toBaseId: body.toBaseId,
            equipmentTypeId: body.equipmentTypeId,
            quantity: body.quantity,
            transferredAt,
            initiatedById: actor.userId,
            notes: body.notes,
          },
          include: { fromBase: true, toBase: true, equipmentType: true },
        });
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
