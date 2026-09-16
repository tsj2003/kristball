import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticateToken, authorizeRoles } from "../middleware/auth";
import { parseOptionalDate } from "../lib/http";

export const auditRouter = Router();

auditRouter.use(authenticateToken, authorizeRoles("ADMIN"));

auditRouter.get("/", async (req, res, next) => {
  try {
    const startDate = parseOptionalDate(req.query.startDate);
    const endDate = parseOptionalDate(req.query.endDate);
    const action = typeof req.query.action === "string" ? req.query.action : undefined;
    const entityType = typeof req.query.entityType === "string" ? req.query.entityType : undefined;

    const logs = await prisma.auditLog.findMany({
      where: {
        action,
        entityType,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        user: { select: { id: true, username: true, fullName: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    res.json({ logs });
  } catch (err) {
    next(err);
  }
});
