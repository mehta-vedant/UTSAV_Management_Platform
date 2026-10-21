-- Earlier releases permitted several active receipts. Preserve their metadata
-- for audit, but retain only the best evidence per expense: an uploaded file
-- first, otherwise the newest pending upload. This makes the new constraint
-- deployable without discarding financial history.
WITH ranked_receipts AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "expenseId"
      ORDER BY
        CASE WHEN "status" = 'UPLOADED' THEN 0 ELSE 1 END,
        "createdAt" DESC
    ) AS receipt_rank
  FROM "ExpenseReceipt"
  WHERE "deletedAt" IS NULL
    AND "status" IN ('PENDING_UPLOAD', 'UPLOADED')
)
UPDATE "ExpenseReceipt" AS receipt
SET
  "status" = 'FAILED',
  "failedAt" = NOW(),
  "failureReason" = 'Superseded by the one-receipt-per-expense policy.'
FROM ranked_receipts
WHERE receipt."id" = ranked_receipts."id"
  AND ranked_receipts.receipt_rank > 1;

-- Failed attempts remain available for audit/retry diagnostics, but an
-- expense can have only one live receipt: either being uploaded or confirmed.
CREATE UNIQUE INDEX "ExpenseReceipt_one_active_receipt_per_expense"
  ON "ExpenseReceipt" ("expenseId")
  WHERE "deletedAt" IS NULL
    AND "status" IN ('PENDING_UPLOAD', 'UPLOADED');
