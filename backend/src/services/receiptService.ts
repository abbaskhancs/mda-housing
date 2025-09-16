import { PrismaClient } from '@prisma/client';
import { uploadFile } from '../config/storage';
import { logger } from '../config/logger';
import { PDFService } from './pdfService';
import QRCode from 'qrcode';

const prisma = new PrismaClient();
const pdfService = new PDFService();



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

    // Generate QR code for the application
    const qrCodeDataURL = await QRCode.toDataURL(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/applications/${application.id}`);

    // Prepare template data for PDF generation
    const templateData = {
      application: {
        id: application.id,
        applicationNumber: application.applicationNumber,
        createdAt: application.createdAt,
        currentStage: application.currentStage.code,
        seller: application.seller,
        buyer: application.buyer,
        attorney: application.attorney
      },
      plot: {
        plotNumber: application.plot.plotNumber,
        blockNumber: application.plot.blockNumber,
        sectorNumber: application.plot.sectorNumber,
        area: application.plot.area,
        location: application.plot.location
      },
      attachments: application.attachments,
      qrCodeDataURL
    };

    // Generate PDF using the PDF service
    const receiptPdfBuffer = await pdfService.generateIntakeReceipt(templateData);

    // Upload receipt to storage
    const receiptFile = {
      buffer: receiptPdfBuffer,
      originalname: `intake-receipt-${application.applicationNumber}.pdf`,
      mimetype: 'application/pdf',
      size: receiptPdfBuffer.length,
      fieldname: 'receipt',
      encoding: '7bit',
      stream: null as any,
      destination: '',
      filename: `intake-receipt-${application.applicationNumber}.pdf`
    } as Express.Multer.File;

    const uploadResult = await uploadFile(receiptFile, applicationId, 'IntakeReceipt');

    logger.info(`Intake receipt generated for application ${applicationId}: ${uploadResult.url}`);

    return uploadResult.url;
  } catch (error) {
    logger.error('Error generating intake receipt:', error);
    throw error;
  }
};



export const createReceiptRecord = async (applicationId: string, receiptUrl: string): Promise<void> => {
  try {
    // Create a record in the database for the receipt
    await prisma.attachment.create({
      data: {
        applicationId,
        docType: 'IntakeReceipt',
        fileName: `intake-receipt-${applicationId}.pdf`,
        originalName: `Intake Receipt - ${applicationId}`,
        fileSize: 0, // Will be updated when PDF is generated
        mimeType: 'application/pdf',
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
