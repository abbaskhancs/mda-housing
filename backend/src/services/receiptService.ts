import { PrismaClient } from '@prisma/client';
import { uploadFile } from '../config/storage';
import { logger } from '../config/logger';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export interface ReceiptData {
  applicationId: string;
  applicationNumber: string;
  sellerName: string;
  buyerName: string;
  plotNumber: string;
  submittedAt: string;
  attachments: Array<{
    docType: string;
    fileName: string;
    uploadedAt: string;
  }>;
}

export const generateIntakeReceipt = async (applicationId: string): Promise<string> => {
  try {
    // Get application with all related data
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        seller: true,
        buyer: true,
        attorney: true,
        plot: true,
        currentStage: true,
        attachments: {
          orderBy: { uploadedAt: 'asc' }
        }
      }
    });

    if (!application) {
      throw new Error('Application not found');
    }

    // Prepare receipt data
    const receiptData: ReceiptData = {
      applicationId: application.id,
      applicationNumber: application.applicationNumber,
      sellerName: application.seller.name,
      buyerName: application.buyer.name,
      plotNumber: application.plot.plotNumber,
      submittedAt: application.submittedAt.toISOString(),
      attachments: application.attachments.map(att => ({
        docType: att.docType,
        fileName: att.originalName,
        uploadedAt: att.uploadedAt.toISOString()
      }))
    };

    // Generate receipt HTML
    const receiptHtml = await generateReceiptHtml(receiptData);

    // Convert HTML to PDF (placeholder - will be implemented with Puppeteer later)
    const receiptPdfBuffer = Buffer.from(receiptHtml, 'utf-8');

    // Upload receipt to storage
    const receiptFile = {
      buffer: receiptPdfBuffer,
      originalname: `intake-receipt-${application.applicationNumber}.html`,
      mimetype: 'text/html',
      size: receiptPdfBuffer.length,
      fieldname: 'receipt',
      encoding: '7bit',
      stream: null as any,
      destination: '',
      filename: `intake-receipt-${application.applicationNumber}.html`
    } as Express.Multer.File;

    const uploadResult = await uploadFile(receiptFile, applicationId, 'IntakeReceipt');

    logger.info(`Intake receipt generated for application ${applicationId}: ${uploadResult.url}`);

    return uploadResult.url;
  } catch (error) {
    logger.error('Error generating intake receipt:', error);
    throw error;
  }
};

const generateReceiptHtml = async (data: ReceiptData): Promise<string> => {
  // Simple HTML template for now - will be replaced with Handlebars template later
  const template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Intake Receipt - ${data.applicationNumber}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .section { margin: 20px 0; }
        .field { margin: 10px 0; }
        .label { font-weight: bold; }
        .attachments { margin-top: 20px; }
        .attachment-item { margin: 5px 0; padding: 5px; background-color: #f5f5f5; }
    </style>
</head>
<body>
    <div class="header">
        <h1>MDA Housing Transfer Application</h1>
        <h2>Intake Receipt</h2>
    </div>
    
    <div class="section">
        <h3>Application Details</h3>
        <div class="field">
            <span class="label">Application Number:</span> ${data.applicationNumber}
        </div>
        <div class="field">
            <span class="label">Application ID:</span> ${data.applicationId}
        </div>
        <div class="field">
            <span class="label">Submitted At:</span> ${new Date(data.submittedAt).toLocaleString()}
        </div>
    </div>
    
    <div class="section">
        <h3>Parties</h3>
        <div class="field">
            <span class="label">Seller:</span> ${data.sellerName}
        </div>
        <div class="field">
            <span class="label">Buyer:</span> ${data.buyerName}
        </div>
    </div>
    
    <div class="section">
        <h3>Property</h3>
        <div class="field">
            <span class="label">Plot Number:</span> ${data.plotNumber}
        </div>
    </div>
    
    <div class="section attachments">
        <h3>Submitted Documents</h3>
        ${data.attachments.map(att => `
            <div class="attachment-item">
                <strong>${att.docType}:</strong> ${att.fileName} 
                <em>(Uploaded: ${new Date(att.uploadedAt).toLocaleString()})</em>
            </div>
        `).join('')}
    </div>
    
    <div class="section">
        <p><em>This receipt confirms that the application has been received and is under review.</em></p>
        <p><em>Generated on: ${new Date().toLocaleString()}</em></p>
    </div>
</body>
</html>`;

  return template;
};

export const createReceiptRecord = async (applicationId: string, receiptUrl: string): Promise<void> => {
  try {
    // Create a record in the database for the receipt
    await prisma.attachment.create({
      data: {
        applicationId,
        docType: 'IntakeReceipt',
        fileName: `intake-receipt-${applicationId}.html`,
        originalName: `Intake Receipt - ${applicationId}`,
        fileSize: 0, // Will be updated when PDF is generated
        mimeType: 'text/html',
        storageUrl: receiptUrl,
        isOriginalSeen: true
      }
    });

    logger.info(`Receipt record created for application ${applicationId}`);
  } catch (error) {
    logger.error('Error creating receipt record:', error);
    throw error;
  }
};
