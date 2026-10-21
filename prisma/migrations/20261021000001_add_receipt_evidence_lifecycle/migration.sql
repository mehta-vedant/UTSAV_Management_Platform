ALTER TABLE "ExpenseReceipt"
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedById" TEXT;

CREATE INDEX "ExpenseReceipt_organizationId_deletedAt_idx"
  ON "ExpenseReceipt"("organizationId", "deletedAt");

ALTER TABLE "ExpenseReceipt"
  ADD CONSTRAINT "ExpenseReceipt_deletedById_fkey"
  FOREIGN KEY ("deletedById") REFERENCES "OrganizationMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
