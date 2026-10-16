CREATE TYPE "ReceiptUploadStatus" AS ENUM ('PENDING_UPLOAD', 'UPLOADED', 'FAILED');
CREATE TYPE "ReceiptExtractionStatus" AS ENUM ('NOT_REQUESTED', 'PENDING', 'COMPLETED', 'FAILED', 'REVIEWED');

CREATE TABLE "AiRequestLimit" (
  "key" TEXT NOT NULL,
  "windowStartedAt" TIMESTAMP(3) NOT NULL,
  "requests" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiRequestLimit_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "IdempotencyRecord" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "entityId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IdempotencyRecord_organizationId_key_key" ON "IdempotencyRecord"("organizationId", "key");
CREATE INDEX "IdempotencyRecord_organizationId_operation_idx" ON "IdempotencyRecord"("organizationId", "operation");

ALTER TABLE "EventAssignment" ADD COLUMN "organizationId" TEXT;
UPDATE "EventAssignment" AS assignment
SET "organizationId" = event."organizationId"
FROM "Event" AS event
WHERE assignment."eventId" = event."id";
ALTER TABLE "EventAssignment" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE INDEX "EventAssignment_organizationId_idx" ON "EventAssignment"("organizationId");
ALTER TABLE "EventAssignment"
  ADD CONSTRAINT "EventAssignment_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventRegistration" ADD COLUMN "organizationId" TEXT;
UPDATE "EventRegistration" AS registration
SET "organizationId" = event."organizationId"
FROM "Event" AS event
WHERE registration."eventId" = event."id";
ALTER TABLE "EventRegistration" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE INDEX "EventRegistration_organizationId_idx" ON "EventRegistration"("organizationId");
ALTER TABLE "EventRegistration"
  ADD CONSTRAINT "EventRegistration_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The single-column foreign keys above prove that each referenced row exists.
-- These composite keys additionally prove that the event/member and child row
-- belong to the *same* organization, even if a future code path is incorrect.
CREATE UNIQUE INDEX "Event_id_organizationId_key" ON "Event"("id", "organizationId");
CREATE UNIQUE INDEX "OrganizationMember_id_organizationId_key" ON "OrganizationMember"("id", "organizationId");
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "EventAssignment" assignment
    JOIN "OrganizationMember" member ON member."id" = assignment."organizationMemberId"
    WHERE member."organizationId" <> assignment."organizationId"
  ) THEN
    RAISE EXCEPTION 'Cannot add tenant integrity constraint: EventAssignment contains a member from another organization. Repair those rows explicitly before migrating.';
  END IF;
END $$;
ALTER TABLE "EventAssignment"
  ADD CONSTRAINT "EventAssignment_eventId_organizationId_fkey"
  FOREIGN KEY ("eventId", "organizationId") REFERENCES "Event"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventAssignment"
  ADD CONSTRAINT "EventAssignment_memberId_organizationId_fkey"
  FOREIGN KEY ("organizationMemberId", "organizationId") REFERENCES "OrganizationMember"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventRegistration"
  ADD CONSTRAINT "EventRegistration_eventId_organizationId_fkey"
  FOREIGN KEY ("eventId", "organizationId") REFERENCES "Event"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ExpenseReceipt" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "expenseId" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "originalFileName" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "status" "ReceiptUploadStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
  "uploadExpiresAt" TIMESTAMP(3),
  "uploadedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "extractionStatus" "ReceiptExtractionStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
  "extractionConsentAt" TIMESTAMP(3),
  "extraction" JSONB,
  "extractionReviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExpenseReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExpenseReceipt_objectKey_key" ON "ExpenseReceipt"("objectKey");
CREATE INDEX "ExpenseReceipt_organizationId_expenseId_idx" ON "ExpenseReceipt"("organizationId", "expenseId");
CREATE INDEX "ExpenseReceipt_uploadedById_idx" ON "ExpenseReceipt"("uploadedById");
ALTER TABLE "ExpenseReceipt"
  ADD CONSTRAINT "ExpenseReceipt_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExpenseReceipt"
  ADD CONSTRAINT "ExpenseReceipt_expenseId_fkey"
  FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExpenseReceipt"
  ADD CONSTRAINT "ExpenseReceipt_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "OrganizationMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
