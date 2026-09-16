import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticateToken, authorizeRoles, enforceBaseScope } from "../middleware/auth";
import { actorFrom, HttpError, parseOptionalDate } from "../lib/http";
import { assertAvailable, remainingOnAssignment, withStockLock } from "../services/inventory";
import { writeAudit } from "../services/audit";

export const assignmentsRouter = Router();

assignmentsRouter.use(authenticateToken, enforceBaseScope);

assignmentsRouter.get("/", async (req, res, next) => {
  try {
    const equipmentTypeId =
      typeof req.query.equipmentTypeId === "string" ? req.query.equipmentTypeId : undefined;
    const personnelId =
      typeof req.query.personnelId === "string" ? req.query.personnelId : undefined;

    const assignments = await prisma.assignment.findMany({
      where: {
        baseId: req.scopedBaseId ?? undefined,
        equipmentTypeId,
        personnelId,
      },
      include: {
        base: true,
        personnel: true,
        equipmentType: true,
        assignedBy: { select: { id: true, fullName: true, username: true } },
        expenditures: true,
      },
      orderBy: { assignedAt: "desc" },
    });

    res.json({
      assignments: assignments.map((row) => {
        const expended = row.expenditures.reduce((sum, item) => sum + item.quantity, 0);
        return {
          ...row,
          expended,
          remaining: row.quantity - expended,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

const assignSchema = z.object({
  baseId: z.string().uuid(),
  personnelId: z.string().uuid(),
  equipmentTypeId: z.string().uuid(),
  quantity: z.number().int().positive(),
  assignedAt: z.string().min(1),
  notes: z.string().max(500).optional(),
});

assignmentsRouter.post(
  "/",
  authorizeRoles("ADMIN", "BASE_COMMANDER"),
  async (req, res, next) => {
    try {
      const actor = actorFrom(req);
      const body = assignSchema.parse({
        ...req.body,
        quantity: Number(req.body.quantity),
      });

      const baseId = actor.role === "ADMIN" ? body.baseId : actor.baseId!;
      const assignedAt = new Date(body.assignedAt);
      if (Number.isNaN(assignedAt.getTime())) {
        throw new HttpError(400, "Invalid assignedAt");
      }

      const person = await prisma.personnel.findUnique({ where: { id: body.personnelId } });
      if (!person) {
        throw new HttpError(400, "Personnel record not found");
      }
      if (person.baseId !== baseId) {
        throw new HttpError(400, "Personnel must belong to the issuing base");
      }

      const assignment = await withStockLock(baseId, body.equipmentTypeId, async (tx) => {
        await assertAvailable(tx, baseId, body.equipmentTypeId, body.quantity);
        const created = await tx.assignment.create({
          data: {
            baseId,
            personnelId: body.personnelId,
            equipmentTypeId: body.equipmentTypeId,
            quantity: body.quantity,
            assignedAt,
            assignedById: actor.userId,
            notes: body.notes,
          },
          include: { personnel: true, equipmentType: true, base: true },
        });
        await writeAudit(tx, {
          userId: actor.userId,
          action: "ASSIGNMENT_CREATED",
          entityType: "Assignment",
          entityId: created.id,
          details: {
            personnelId: body.personnelId,
            equipmentTypeId: body.equipmentTypeId,
            quantity: body.quantity,
            baseId,
          },
        });
        return created;
      });

      res.status(201).json({
        assignment: { ...assignment, expended: 0, remaining: assignment.quantity },
      });
    } catch (err) {
      next(err);
    }
  }
);

const expendSchema = z.object({
  assignmentId: z.string().uuid(),
  quantity: z.number().int().positive(),
  expendedAt: z.string().min(1),
  notes: z.string().max(500).optional(),
});

assignmentsRouter.post(
  "/expenditures",
  authorizeRoles("ADMIN", "BASE_COMMANDER"),
  async (req, res, next) => {
    try {
      const actor = actorFrom(req);
      const body = expendSchema.parse({
        ...req.body,
        quantity: Number(req.body.quantity),
      });
      const expendedAt = new Date(body.expendedAt);
      if (Number.isNaN(expendedAt.getTime())) {
        throw new HttpError(400, "Invalid expendedAt");
      }

      const assignment = await prisma.assignment.findUnique({
        where: { id: body.assignmentId },
        include: { personnel: true, equipmentType: true },
      });
      if (!assignment) {
        throw new HttpError(404, "Assignment not found");
      }
      if (actor.role !== "ADMIN" && assignment.baseId !== actor.baseId) {
        throw new HttpError(403, "Assignment is outside your base");
      }

      const expenditure = await prisma.$transaction(async (tx) => {
        const remaining = await remainingOnAssignment(tx, assignment.id);
        if (body.quantity > remaining) {
          throw new HttpError(
            409,
            `Cannot expend ${body.quantity}; only ${remaining} remaining on this assignment`
          );
        }
        const created = await tx.expenditure.create({
          data: {
            assignmentId: assignment.id,
            quantity: body.quantity,
            expendedAt,
            recordedById: actor.userId,
            notes: body.notes,
          },
        });
        await writeAudit(tx, {
          userId: actor.userId,
          action: "EXPENDITURE_RECORDED",
          entityType: "Expenditure",
          entityId: created.id,
          details: {
            assignmentId: assignment.id,
            personnelId: assignment.personnelId,
            equipmentTypeId: assignment.equipmentTypeId,
            quantity: body.quantity,
            remainingAfter: remaining - body.quantity,
          },
        });
        return { created, remainingAfter: remaining - body.quantity };
      });

      res.status(201).json({
        expenditure: expenditure.created,
        remaining: expenditure.remainingAfter,
        personnelName: assignment.personnel.fullName,
        equipmentName: assignment.equipmentType.name,
      });
    } catch (err) {
      next(err);
    }
  }
);

assignmentsRouter.get("/expenditures", async (req, res, next) => {
  try {
    const startDate = parseOptionalDate(req.query.startDate);
    const endDate = parseOptionalDate(req.query.endDate);
    const rows = await prisma.expenditure.findMany({
      where: {
        expendedAt: { gte: startDate, lte: endDate },
        assignment: {
          baseId: req.scopedBaseId ?? undefined,
        },
      },
      include: {
        recordedBy: { select: { id: true, fullName: true, username: true } },
        assignment: {
          include: {
            personnel: true,
            equipmentType: true,
            base: true,
          },
        },
      },
      orderBy: { expendedAt: "desc" },
    });
    res.json({ expenditures: rows });
  } catch (err) {
    next(err);
  }
});
