"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.packetService = exports.PacketService = void 0;
const archiver_1 = __importDefault(require("archiver"));
const client_1 = require("@prisma/client");
const documentService_1 = require("./documentService");
const logger_1 = require("../config/logger");
const prisma = new client_1.PrismaClient();
class PacketService {
    constructor() {
        this.documentService = new documentService_1.DocumentService();
    }
    /**
     * Generate all required documents for a case packet
     * Documents #1-#5: Intake Receipt, Clearances (BCA, Housing, Accounts), Challan, Memo, Deed
     */
    async generatePacketDocuments(applicationId) {
        try {
            // Fetch application with all related data
            const application = await prisma.application.findUnique({
                where: { id: applicationId },
                include: {
                    seller: true,
                    buyer: true,
                    attorney: true,
                    plot: {
                        include: {
                            currentOwner: true
                        }
                    },
                    attachments: true,
                    clearances: {
                        include: {
                            section: true,
                            status: true
                        }
                    },
                    accountsBreakdown: true,
                    transferDeed: {
                        include: {
                            witness1: true,
                            witness2: true
                        }
                    },
                    reviews: {
                        include: {
                            section: true
                        }
                    }
                }
            });
            if (!application) {
                throw new Error(`Application not found: ${applicationId}`);
            }
            // Prepare template data
            const templateData = {
                application: application,
                plot: application.plot,
                attachments: application.attachments,
                clearances: application.clearances,
                reviews: application.reviews,
                accountsBreakdown: application.accountsBreakdown,
                transferDeed: application.transferDeed,
                witness1: application.transferDeed?.witness1,
                witness2: application.transferDeed?.witness2,
                generatedAt: new Date()
            };
            const documents = [];
            // Document #1: Intake Receipt
            try {
                const intakeReceiptResult = await this.documentService.generateDocument({
                    applicationId,
                    documentType: 'INTAKE_RECEIPT',
                    templateData,
                    expiresInHours: 1
                });
                // Get the actual PDF buffer by re-generating (since we only get URL from documentService)
                const { pdfService } = await Promise.resolve().then(() => __importStar(require('./pdfService')));
                const intakeReceiptBuffer = await pdfService.generateIntakeReceipt(templateData);
                documents.push({
                    name: '01_Intake_Receipt.pdf',
                    buffer: intakeReceiptBuffer,
                    type: 'INTAKE_RECEIPT'
                });
            }
            catch (error) {
                logger_1.logger.warn(`Failed to generate intake receipt for packet ${applicationId}:`, error);
            }
            // Document #2: BCA Clearance
            try {
                const bcaClearanceBuffer = await this.generateClearanceDocument(templateData, 'BCA');
                documents.push({
                    name: '02_BCA_Clearance.pdf',
                    buffer: bcaClearanceBuffer,
                    type: 'BCA_CLEARANCE'
                });
            }
            catch (error) {
                logger_1.logger.warn(`Failed to generate BCA clearance for packet ${applicationId}:`, error);
            }
            // Document #3: Housing Clearance
            try {
                const housingClearanceBuffer = await this.generateClearanceDocument(templateData, 'HOUSING');
                documents.push({
                    name: '03_Housing_Clearance.pdf',
                    buffer: housingClearanceBuffer,
                    type: 'HOUSING_CLEARANCE'
                });
            }
            catch (error) {
                logger_1.logger.warn(`Failed to generate Housing clearance for packet ${applicationId}:`, error);
            }
            // Document #4: Accounts Clearance
            try {
                const accountsClearanceBuffer = await this.generateClearanceDocument(templateData, 'ACCOUNTS');
                documents.push({
                    name: '04_Accounts_Clearance.pdf',
                    buffer: accountsClearanceBuffer,
                    type: 'ACCOUNTS_CLEARANCE'
                });
            }
            catch (error) {
                logger_1.logger.warn(`Failed to generate Accounts clearance for packet ${applicationId}:`, error);
            }
            // Document #5: Challan
            try {
                const { pdfService } = await Promise.resolve().then(() => __importStar(require('./pdfService')));
                const challanBuffer = await pdfService.generateChallan(templateData);
                documents.push({
                    name: '05_Challan.pdf',
                    buffer: challanBuffer,
                    type: 'CHALLAN'
                });
            }
            catch (error) {
                logger_1.logger.warn(`Failed to generate challan for packet ${applicationId}:`, error);
            }
            // Document #6: Dispatch Memo
            try {
                const { pdfService } = await Promise.resolve().then(() => __importStar(require('./pdfService')));
                const memoBuffer = await pdfService.generateDispatchMemo({
                    ...templateData,
                    memoId: `MEMO-${applicationId}-${Date.now()}`,
                    memoDate: new Date()
                });
                documents.push({
                    name: '06_Dispatch_Memo.pdf',
                    buffer: memoBuffer,
                    type: 'DISPATCH_MEMO'
                });
            }
            catch (error) {
                logger_1.logger.warn(`Failed to generate dispatch memo for packet ${applicationId}:`, error);
            }
            // Document #7: Transfer Deed
            try {
                const { pdfService } = await Promise.resolve().then(() => __importStar(require('./pdfService')));
                const deedBuffer = await pdfService.generateTransferDeed(templateData);
                documents.push({
                    name: '07_Transfer_Deed.pdf',
                    buffer: deedBuffer,
                    type: 'TRANSFER_DEED'
                });
            }
            catch (error) {
                logger_1.logger.warn(`Failed to generate transfer deed for packet ${applicationId}:`, error);
            }
            logger_1.logger.info(`Generated ${documents.length} documents for packet ${applicationId}`);
            return documents;
        }
        catch (error) {
            logger_1.logger.error(`Failed to generate packet documents for ${applicationId}:`, error);
            throw error;
        }
    }
    /**
     * Generate clearance document for specific section
     */
    async generateClearanceDocument(templateData, sectionName) {
        const { pdfService } = await Promise.resolve().then(() => __importStar(require('./pdfService')));
        return pdfService.generateClearanceCertificate({
            ...templateData,
            sectionName
        });
    }
    /**
     * Create a zip file containing all packet documents
     */
    async createPacketZip(applicationId) {
        try {
            const documents = await this.generatePacketDocuments(applicationId);
            if (documents.length === 0) {
                throw new Error('No documents available for packet creation');
            }
            return new Promise((resolve, reject) => {
                const archive = (0, archiver_1.default)('zip', {
                    zlib: { level: 9 } // Maximum compression
                });
                const chunks = [];
                archive.on('data', (chunk) => {
                    chunks.push(chunk);
                });
                archive.on('end', () => {
                    const zipBuffer = Buffer.concat(chunks);
                    logger_1.logger.info(`Created packet zip for application ${applicationId}, size: ${zipBuffer.length} bytes`);
                    resolve(zipBuffer);
                });
                archive.on('error', (error) => {
                    logger_1.logger.error(`Failed to create packet zip for ${applicationId}:`, error);
                    reject(error);
                });
                // Add each document to the zip
                documents.forEach(doc => {
                    archive.append(doc.buffer, { name: doc.name });
                });
                // Finalize the archive
                archive.finalize();
            });
        }
        catch (error) {
            logger_1.logger.error(`Failed to create packet zip for ${applicationId}:`, error);
            throw error;
        }
    }
    /**
     * Get packet filename for download
     */
    getPacketFilename(applicationId) {
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        return `Case_Packet_${applicationId}_${timestamp}.zip`;
    }
}
exports.PacketService = PacketService;
exports.packetService = new PacketService();
