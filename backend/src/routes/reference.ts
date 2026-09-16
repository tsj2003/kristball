import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticateToken, enforceBaseScope } from "../middleware/auth";

export const referenceRouter = Router();

referenceRouter.use(authenticateToken, enforceBaseScope);

referenceRouter.get("/bases", async (_req, res, next) => {
  try {
    const bases = await prisma.base.findMany({ orderBy: { name: "asc" } });
    res.json({ bases });
  } catch (err) {
    next(err);
  }
});

referenceRouter.get("/equipment-types", async (_req, res, next) => {
  try {
    const equipmentTypes = await prisma.equipmentType.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    res.json({ equipmentTypes });
  } catch (err) {
    next(err);
  }
});

referenceRouter.get("/personnel", async (req, res, next) => {
  try {
    const personnel = await prisma.personnel.findMany({
      where: req.scopedBaseId ? { baseId: req.scopedBaseId } : undefined,
      include: { base: { select: { id: true, name: true, code: true } } },
      orderBy: [{ rank: "asc" }, { fullName: "asc" }],
    });
    res.json({ personnel });
  } catch (err) {
    next(err);
  }
});
