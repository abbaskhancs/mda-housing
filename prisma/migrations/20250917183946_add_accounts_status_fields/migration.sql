-- AlterTable
ALTER TABLE "accounts_breakdown" ADD COLUMN "accountsStatus" TEXT;
ALTER TABLE "accounts_breakdown" ADD COLUMN "objectionDate" DATETIME;
ALTER TABLE "accounts_breakdown" ADD COLUMN "objectionReason" TEXT;
ALTER TABLE "accounts_breakdown" ADD COLUMN "resolvedDate" DATETIME;
