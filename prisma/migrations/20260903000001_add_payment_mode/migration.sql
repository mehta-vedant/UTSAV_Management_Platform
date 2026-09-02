-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER');

-- AlterTable
ALTER TABLE "Donation" ADD COLUMN "paymentMode" "PaymentMode" NOT NULL DEFAULT 'CASH';

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "paymentMode" "PaymentMode" NOT NULL DEFAULT 'CASH';