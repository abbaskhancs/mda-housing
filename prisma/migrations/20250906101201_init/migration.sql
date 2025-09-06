-- CreateTable
CREATE TABLE "wf_status" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "wf_section" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "wf_section_group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "wf_section_group_member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sectionGroupId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "wf_section_group_member_sectionGroupId_fkey" FOREIGN KEY ("sectionGroupId") REFERENCES "wf_section_group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "wf_section_group_member_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "wf_section" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "wf_stage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "wf_transition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromStageId" TEXT NOT NULL,
    "toStageId" TEXT NOT NULL,
    "guardName" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "wf_transition_fromStageId_fkey" FOREIGN KEY ("fromStageId") REFERENCES "wf_stage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "wf_transition_toStageId_fkey" FOREIGN KEY ("toStageId") REFERENCES "wf_stage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cnic" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fatherName" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "plot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plotNumber" TEXT NOT NULL,
    "blockNumber" TEXT,
    "sectorNumber" TEXT,
    "area" DECIMAL,
    "location" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationNumber" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "attorneyId" TEXT,
    "plotId" TEXT NOT NULL,
    "currentStageId" TEXT NOT NULL,
    "previousStageId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
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

-- CreateTable
CREATE TABLE "attachment" (
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
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "attachment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "clearance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "statusId" TEXT NOT NULL,
    "remarks" TEXT,
    "signedPdfUrl" TEXT,
    "clearedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "clearance_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "clearance_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "wf_section" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "clearance_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "wf_status" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "accounts_breakdown" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "totalAmount" DECIMAL NOT NULL,
    "paidAmount" DECIMAL NOT NULL DEFAULT 0,
    "remainingAmount" DECIMAL NOT NULL,
    "challanUrl" TEXT,
    "paymentVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "accounts_breakdown_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "review_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "review_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "wf_section" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "transfer_deed" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "witness1Id" TEXT NOT NULL,
    "witness2Id" TEXT NOT NULL,
    "deedContent" TEXT,
    "deedPdfUrl" TEXT,
    "hashSha256" TEXT,
    "isFinalized" BOOLEAN NOT NULL DEFAULT false,
    "finalizedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "transfer_deed_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "transfer_deed_witness1Id_fkey" FOREIGN KEY ("witness1Id") REFERENCES "person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "transfer_deed_witness2Id_fkey" FOREIGN KEY ("witness2Id") REFERENCES "person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStageId" TEXT,
    "toStageId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_log_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "wf_status_code_key" ON "wf_status"("code");

-- CreateIndex
CREATE UNIQUE INDEX "wf_section_code_key" ON "wf_section"("code");

-- CreateIndex
CREATE UNIQUE INDEX "wf_section_group_code_key" ON "wf_section_group"("code");

-- CreateIndex
CREATE UNIQUE INDEX "wf_section_group_member_sectionGroupId_sectionId_key" ON "wf_section_group_member"("sectionGroupId", "sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "wf_stage_code_key" ON "wf_stage"("code");

-- CreateIndex
CREATE UNIQUE INDEX "wf_transition_fromStageId_toStageId_key" ON "wf_transition"("fromStageId", "toStageId");

-- CreateIndex
CREATE UNIQUE INDEX "person_cnic_key" ON "person"("cnic");

-- CreateIndex
CREATE UNIQUE INDEX "plot_plotNumber_key" ON "plot"("plotNumber");

-- CreateIndex
CREATE UNIQUE INDEX "application_applicationNumber_key" ON "application"("applicationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "clearance_applicationId_sectionId_key" ON "clearance"("applicationId", "sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_breakdown_applicationId_key" ON "accounts_breakdown"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "review_applicationId_sectionId_key" ON "review"("applicationId", "sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_deed_applicationId_key" ON "transfer_deed"("applicationId");
