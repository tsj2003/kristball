import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticateToken, authorizeRoles, enforceBaseScope } from "../middleware/auth";
import { actorFrom, parseOptionalDate, startOfDay, endOfDay } from "../lib/http";
import { writeAudit } from "../services/audit";

export const purchasesRouter = Router();

purchasesRouter.use(authenticateToken, enforceBaseScope);

purchasesRouter.get("/", async (req, res, next) => {
  try {
    const start = parseOptionalDate(req.query.startDate);
    const end = parseOptionalDate(req.query.endDate);
    const equipmentTypeId =
      typeof req.query.equipmentTypeId === "string" ? req.query.equipmentTypeId : undefined;

    const purchases = await prisma.purchase.findMany({
      where: {
        baseId: req.scopedBaseId ?? undefined,
        equipmentTypeId,
        ...(start || end
          ? {
              purchasedAt: {
                ...(start ? { gte: startOfDay(start) } : {}),
                ...(end ? { lte: endOfDay(end) } : {}),
              },
            }
          : {}),
      },
      include: {
        base: true,
        equipmentType: true,
        purchasedBy: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { purchasedAt: "desc" },
    });
    res.json({ purchases });
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  baseId: z.string().uuid(),
  equipmentTypeId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitCost: z.number().nonnegative(),
  purchasedAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
  notes: z.string().max(500).optional(),
});

purchasesRouter.post(
  "/",
  authorizeRoles("ADMIN", "LOGISTICS_OFFICER"),
  async (req, res, next) => {
    try {
      const actor = actorFrom(req);
      const body = createSchema.parse({
        ...req.body,
        quantity: Number(req.body.quantity),
        unitCost: Number(req.body.unitCost),
      });

      const baseId = actor.role === "ADMIN" ? body.baseId : actor.baseId!;
      const purchasedAt = new Date(body.purchasedAt);
      if (Number.isNaN(purchasedAt.getTime())) {
        throw new Error("Invalid purchasedAt");
      }

      const purchase = await prisma.$transaction(async (tx) => {
        const created = await tx.purchase.create({
          data: {
            baseId,
            equipmentTypeId: body.equipmentTypeId,
            quantity: body.quantity,
            unitCost: body.unitCost,
            purchasedAt,
            purchasedById: actor.userId,
            notes: body.notes,
          },
          include: {
            base: true,
            equipmentType: true,
            purchasedBy: { select: { id: true, fullName: true, username: true } },
          },
        });
        await writeAudit(tx, {
          userId: actor.userId,
          action: "PURCHASE_CREATED",
          entityType: "Purchase",
          entityId: created.id,
          details: {
            baseId,
            equipmentTypeId: body.equipmentTypeId,
            quantity: body.quantity,
            unitCost: body.unitCost,
          },
        });
        return created;
      });

      res.status(201).json({ purchase });
    } catch (err) {
      next(err);
    }
  }
);
