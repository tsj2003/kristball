-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'COMPLETED');

-- AlterTable
ALTER TABLE "Transfer" ADD COLUMN "status" "TransferStatus" NOT NULL DEFAULT 'COMPLETED';

-- CreateTable
CREATE TABLE "ApiAccessLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_baseId_idx" ON "User"("baseId");

-- CreateIndex
CREATE INDEX "Purchase_baseId_idx" ON "Purchase"("baseId");

-- CreateIndex
CREATE INDEX "Purchase_equipmentTypeId_idx" ON "Purchase"("equipmentTypeId");

-- CreateIndex
CREATE INDEX "Purchase_createdAt_idx" ON "Purchase"("createdAt");

-- CreateIndex
CREATE INDEX "Transfer_fromBaseId_idx" ON "Transfer"("fromBaseId");

-- CreateIndex
CREATE INDEX "Transfer_toBaseId_idx" ON "Transfer"("toBaseId");

-- CreateIndex
CREATE INDEX "Transfer_equipmentTypeId_idx" ON "Transfer"("equipmentTypeId");

-- CreateIndex
CREATE INDEX "Transfer_createdAt_idx" ON "Transfer"("createdAt");

-- CreateIndex
CREATE INDEX "Transfer_status_idx" ON "Transfer"("status");

-- CreateIndex
CREATE INDEX "Assignment_baseId_idx" ON "Assignment"("baseId");

-- CreateIndex
CREATE INDEX "Assignment_equipmentTypeId_idx" ON "Assignment"("equipmentTypeId");

-- CreateIndex
CREATE INDEX "Assignment_createdAt_idx" ON "Assignment"("createdAt");

-- CreateIndex
CREATE INDEX "Expenditure_createdAt_idx" ON "Expenditure"("createdAt");

-- CreateIndex
CREATE INDEX "ApiAccessLog_createdAt_idx" ON "ApiAccessLog"("createdAt");

-- CreateIndex
CREATE INDEX "ApiAccessLog_path_idx" ON "ApiAccessLog"("path");

-- CreateIndex
CREATE INDEX "ApiAccessLog_userId_idx" ON "ApiAccessLog"("userId");

-- AddForeignKey
ALTER TABLE "ApiAccessLog" ADD CONSTRAINT "ApiAccessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
