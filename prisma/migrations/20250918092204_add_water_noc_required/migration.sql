-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationNumber" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "attorneyId" TEXT,
    "plotId" TEXT NOT NULL,
    "currentStageId" TEXT NOT NULL,
    "previousStageId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "waterNocRequired" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "application_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "application_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "application_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "person" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "application_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "plot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "application_currentStageId_fkey" FOREIGN KEY ("currentStageId") REFERENCES "wf_stage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "application_previousStageId_fkey" FOREIGN KEY ("previousStageId") REFERENCES "wf_stage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_application" ("applicationNumber", "attorneyId", "buyerId", "createdAt", "currentStageId", "id", "plotId", "previousStageId", "sellerId", "status", "submittedAt", "updatedAt") SELECT "applicationNumber", "attorneyId", "buyerId", "createdAt", "currentStageId", "id", "plotId", "previousStageId", "sellerId", "status", "submittedAt", "updatedAt" FROM "application";
DROP TABLE "application";
ALTER TABLE "new_application" RENAME TO "application";
CREATE UNIQUE INDEX "application_applicationNumber_key" ON "application"("applicationNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
