-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_plot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plotNumber" TEXT NOT NULL,
    "blockNumber" TEXT,
    "sectorNumber" TEXT,
    "area" DECIMAL,
    "location" TEXT,
    "currentOwnerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "plot_currentOwnerId_fkey" FOREIGN KEY ("currentOwnerId") REFERENCES "person" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_plot" ("area", "blockNumber", "createdAt", "id", "location", "plotNumber", "sectorNumber", "updatedAt") SELECT "area", "blockNumber", "createdAt", "id", "location", "plotNumber", "sectorNumber", "updatedAt" FROM "plot";
DROP TABLE "plot";
ALTER TABLE "new_plot" RENAME TO "plot";
CREATE UNIQUE INDEX "plot_plotNumber_key" ON "plot"("plotNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
