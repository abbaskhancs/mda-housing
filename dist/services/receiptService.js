"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReceiptRecord = exports.generateIntakeReceipt = void 0;
const client_1 = require("@prisma/client");
const storage_1 = require("../config/storage");
const logger_1 = require("../config/logger");
const pdfService_1 = require("./pdfService");
const qrcode_1 = __importDefault(require("qrcode"));
const prisma = new client_1.PrismaClient();
const pdfService = new pdfService_1.PDFService();
const generateIntakeReceipt = async (applicationId) => {
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
        const qrCodeDataURL = await qrcode_1.default.toDataURL(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/applications/${application.id}`);
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
            stream: null,
            destination: '',
            filename: `intake-receipt-${application.applicationNumber}.pdf`
        };
        const uploadResult = await (0, storage_1.uploadFile)(receiptFile, applicationId, 'IntakeReceipt');
        logger_1.logger.info(`Intake receipt generated for application ${applicationId}: ${uploadResult.url}`);
        return uploadResult.url;
    }
    catch (error) {
        logger_1.logger.error('Error generating intake receipt:', error);
        throw error;
    }
};
exports.generateIntakeReceipt = generateIntakeReceipt;
const createReceiptRecord = async (applicationId, receiptUrl) => {
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
        logger_1.logger.info(`Receipt record created for application ${applicationId}`);
    }
    catch (error) {
        logger_1.logger.error('Error creating receipt record:', error);
        throw error;
    }
};
exports.createReceiptRecord = createReceiptRecord;
