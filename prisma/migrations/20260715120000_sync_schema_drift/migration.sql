-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'REISSUE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'APPOINTMENT_RESCHEDULED';
ALTER TYPE "NotificationType" ADD VALUE 'NEW_APPOINTMENT';
ALTER TYPE "NotificationType" ADD VALUE 'SYSTEM_ANNOUNCEMENT';

-- AlterTable
ALTER TABLE "appointment" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "doctor" ADD COLUMN     "availability" JSONB;

-- AlterTable
ALTER TABLE "notification" ADD COLUMN     "channelEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "channelSms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smsSent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "patient" ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT;

-- AlterTable
ALTER TABLE "payment" ADD COLUMN     "receiptUrl" TEXT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "suspendedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "department_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "department_name_key" ON "department"("name");

-- CreateIndex
CREATE INDEX "department_deletedAt_idx" ON "department"("deletedAt");

-- CreateIndex
CREATE INDEX "notification_userId_createdAt_idx" ON "notification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "patient_stripeCustomerId_key" ON "patient"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_stripeSubscriptionId_key" ON "patient"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "payment_patientId_createdAt_idx" ON "payment"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "user_suspendedAt_idx" ON "user"("suspendedAt");

