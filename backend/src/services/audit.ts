import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

export async function writeAudit(
  db: Db,
  input: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    details?: Prisma.InputJsonValue;
  }
) {
  await db.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      details: input.details,
    },
  });
}
