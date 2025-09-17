-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_accounts_breakdown" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "arrears" DECIMAL NOT NULL DEFAULT 0,
    "surcharge" DECIMAL NOT NULL DEFAULT 0,
    "nonUser" DECIMAL NOT NULL DEFAULT 0,
    "transferFee" DECIMAL NOT NULL DEFAULT 0,
    "attorneyFee" DECIMAL NOT NULL DEFAULT 0,
    "water" DECIMAL NOT NULL DEFAULT 0,
    "suiGas" DECIMAL NOT NULL DEFAULT 0,
    "additional" DECIMAL NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL NOT NULL,
    "totalAmountWords" TEXT,
    "paidAmount" DECIMAL NOT NULL DEFAULT 0,
    "remainingAmount" DECIMAL NOT NULL,
    "challanNo" TEXT,
    "challanDate" DATETIME,
    "challanUrl" TEXT,
    "paymentVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "accounts_breakdown_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_accounts_breakdown" ("applicationId", "challanUrl", "createdAt", "id", "paidAmount", "paymentVerified", "remainingAmount", "totalAmount", "updatedAt", "verifiedAt") SELECT "applicationId", "challanUrl", "createdAt", "id", "paidAmount", "paymentVerified", "remainingAmount", "totalAmount", "updatedAt", "verifiedAt" FROM "accounts_breakdown";
DROP TABLE "accounts_breakdown";
ALTER TABLE "new_accounts_breakdown" RENAME TO "accounts_breakdown";
CREATE UNIQUE INDEX "accounts_breakdown_applicationId_key" ON "accounts_breakdown"("applicationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
