-- CreateTable
CREATE TABLE "document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "storageUrl" TEXT NOT NULL,
    "hashSha256" TEXT NOT NULL,
    "signedUrl" TEXT,
    "expiresAt" DATETIME,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "document_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "document_applicationId_documentType_key" ON "document"("applicationId", "documentType");
