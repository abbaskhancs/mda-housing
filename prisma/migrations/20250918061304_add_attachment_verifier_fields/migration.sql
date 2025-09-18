-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "hashSha256" TEXT,
    "isOriginalSeen" BOOLEAN NOT NULL DEFAULT false,
    "verifiedById" TEXT,
    "verifiedAt" DATETIME,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "attachment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "attachment_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_attachment" ("applicationId", "createdAt", "docType", "fileName", "fileSize", "hashSha256", "id", "isOriginalSeen", "mimeType", "originalName", "storageUrl", "updatedAt", "uploadedAt") SELECT "applicationId", "createdAt", "docType", "fileName", "fileSize", "hashSha256", "id", "isOriginalSeen", "mimeType", "originalName", "storageUrl", "updatedAt", "uploadedAt" FROM "attachment";
DROP TABLE "attachment";
ALTER TABLE "new_attachment" RENAME TO "attachment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
