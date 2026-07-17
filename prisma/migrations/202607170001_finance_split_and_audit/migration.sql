ALTER TABLE "Organization"
  ADD COLUMN "openingBalance" DECIMAL(12, 2),
  ADD COLUMN "publicFundraisingTarget" DECIMAL(12, 2),
  ADD COLUMN "internalBudgetLimit" DECIMAL(12, 2);

UPDATE "Organization"
SET "openingBalance" = "budgetTarget"
WHERE "openingBalance" IS NULL
  AND "budgetTarget" IS NOT NULL;

CREATE TYPE "AuditVisibility" AS ENUM ('INTERNAL', 'PUBLIC');

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "actorMemberId" TEXT,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "action" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "visibility" "AuditVisibility" NOT NULL DEFAULT 'INTERNAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");
CREATE INDEX "AuditLog_actorMemberId_idx" ON "AuditLog"("actorMemberId");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
