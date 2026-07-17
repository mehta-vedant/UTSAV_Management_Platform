CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'ENDED');
CREATE TYPE "BhogOfferingWindow" AS ENUM ('MORNING', 'EVENING');

ALTER TABLE "Organization"
  ALTER COLUMN "endDate" DROP NOT NULL,
  ADD COLUMN "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "prasadMorningStart" TEXT NOT NULL DEFAULT '08:00',
  ADD COLUMN "prasadMorningEnd" TEXT NOT NULL DEFAULT '11:00',
  ADD COLUMN "prasadEveningStart" TEXT NOT NULL DEFAULT '17:00',
  ADD COLUMN "prasadEveningEnd" TEXT NOT NULL DEFAULT '20:00',
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  ADD COLUMN "endedAt" TIMESTAMP(3),
  ADD COLUMN "endedById" TEXT;

ALTER TABLE "BhogItem"
  ADD COLUMN "offeringDate" TIMESTAMP(3),
  ADD COLUMN "offeringWindow" "BhogOfferingWindow",
  ADD COLUMN "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "BhogItem"
SET
  "offeringDate" = "createdAt",
  "offeringWindow" = 'MORNING',
  "submittedAt" = "createdAt"
WHERE "offeringDate" IS NULL OR "offeringWindow" IS NULL;

ALTER TABLE "BhogItem"
  ALTER COLUMN "offeringDate" SET NOT NULL,
  ALTER COLUMN "offeringWindow" SET NOT NULL;

CREATE INDEX "BhogItem_organizationId_offeringDate_idx" ON "BhogItem"("organizationId", "offeringDate");

ALTER TABLE "Donation"
  ADD COLUMN "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "archivedById" TEXT;

UPDATE "Donation" SET "receivedAt" = "date" WHERE "date" IS NOT NULL;

ALTER TABLE "Expense"
  ADD COLUMN "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "rejectedAt" TIMESTAMP(3),
  ADD COLUMN "processedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "archivedById" TEXT;

UPDATE "Expense" SET "requestedAt" = "createdAt";

ALTER TABLE "BhogItem"
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "preparedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "VolunteerTask"
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "OrganizationInvitation"
  ADD COLUMN "acceptedAt" TIMESTAMP(3),
  ADD COLUMN "revokedAt" TIMESTAMP(3);

ALTER TABLE "AuditLog"
  ADD COLUMN "metadata" JSONB,
  ADD COLUMN "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "AuditLog" SET "occurredAt" = "createdAt";
