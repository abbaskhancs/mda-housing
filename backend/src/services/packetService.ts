import archiver from 'archiver';
import { Readable } from 'stream';
import { PrismaClient } from '@prisma/client';
import { DocumentService } from './documentService';
import { PDFTemplateData } from './pdfService';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export interface PacketDocument {
  name: string;
  buffer: Buffer;
  type: string;
}

export class PacketService {
  private documentService: DocumentService;

  constructor() {
    this.documentService = new DocumentService();
  }

  /**
   * Generate all required documents for a case packet
   * Documents #1-#5: Intake Receipt, Clearances (BCA, Housing, Accounts), Challan, Memo, Deed
   */
  async generatePacketDocuments(applicationId: string): Promise<PacketDocument[]> {
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
      const templateData: PDFTemplateData = {
        application: application as any,
        plot: (application as any).plot,
        attachments: (application as any).attachments,
        clearances: (application as any).clearances,
        reviews: (application as any).reviews,
        accountsBreakdown: (application as any).accountsBreakdown,
        transferDeed: (application as any).transferDeed,
        witness1: (application as any).transferDeed?.witness1,
        witness2: (application as any).transferDeed?.witness2,
        generatedAt: new Date()
      };

      const documents: PacketDocument[] = [];

      // Document #1: Intake Receipt
      try {
        const intakeReceiptResult = await this.documentService.generateDocument({
          applicationId,
          documentType: 'INTAKE_RECEIPT',
          templateData,
          expiresInHours: 1
        });
        
        // Get the actual PDF buffer by re-generating (since we only get URL from documentService)
        const { pdfService } = await import('./pdfService');
        const intakeReceiptBuffer = await pdfService.generateIntakeReceipt(templateData);
        
        documents.push({
          name: '01_Intake_Receipt.pdf',
          buffer: intakeReceiptBuffer,
          type: 'INTAKE_RECEIPT'
        });
      } catch (error) {
        logger.warn(`Failed to generate intake receipt for packet ${applicationId}:`, error);
      }

      // Document #2: BCA Clearance
      try {
        const bcaClearanceBuffer = await this.generateClearanceDocument(templateData, 'BCA');
        documents.push({
          name: '02_BCA_Clearance.pdf',
          buffer: bcaClearanceBuffer,
          type: 'BCA_CLEARANCE'
        });
      } catch (error) {
        logger.warn(`Failed to generate BCA clearance for packet ${applicationId}:`, error);
      }

      // Document #3: Housing Clearance
      try {
        const housingClearanceBuffer = await this.generateClearanceDocument(templateData, 'HOUSING');
        documents.push({
          name: '03_Housing_Clearance.pdf',
          buffer: housingClearanceBuffer,
          type: 'HOUSING_CLEARANCE'
        });
      } catch (error) {
        logger.warn(`Failed to generate Housing clearance for packet ${applicationId}:`, error);
      }

      // Document #4: Accounts Clearance
      try {
        const accountsClearanceBuffer = await this.generateClearanceDocument(templateData, 'ACCOUNTS');
        documents.push({
          name: '04_Accounts_Clearance.pdf',
          buffer: accountsClearanceBuffer,
          type: 'ACCOUNTS_CLEARANCE'
        });
      } catch (error) {
        logger.warn(`Failed to generate Accounts clearance for packet ${applicationId}:`, error);
      }

      // Document #5: Challan
      try {
        const { pdfService } = await import('./pdfService');
        const challanBuffer = await pdfService.generateChallan(templateData);
        documents.push({
          name: '05_Challan.pdf',
          buffer: challanBuffer,
          type: 'CHALLAN'
        });
      } catch (error) {
        logger.warn(`Failed to generate challan for packet ${applicationId}:`, error);
      }

      // Document #6: Dispatch Memo
      try {
        const { pdfService } = await import('./pdfService');
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
      } catch (error) {
        logger.warn(`Failed to generate dispatch memo for packet ${applicationId}:`, error);
      }

      // Document #7: Transfer Deed
      try {
        const { pdfService } = await import('./pdfService');
        const deedBuffer = await pdfService.generateTransferDeed(templateData);
        documents.push({
          name: '07_Transfer_Deed.pdf',
          buffer: deedBuffer,
          type: 'TRANSFER_DEED'
        });
      } catch (error) {
        logger.warn(`Failed to generate transfer deed for packet ${applicationId}:`, error);
      }

      logger.info(`Generated ${documents.length} documents for packet ${applicationId}`);
      return documents;

    } catch (error) {
      logger.error(`Failed to generate packet documents for ${applicationId}:`, error);
      throw error;
    }
  }

  /**
   * Generate clearance document for specific section
   */
  private async generateClearanceDocument(templateData: PDFTemplateData, sectionName: string): Promise<Buffer> {
    const { pdfService } = await import('./pdfService');
    return pdfService.generateClearanceCertificate({
      ...templateData,
      sectionName
    });
  }

  /**
   * Create a zip file containing all packet documents
   */
  async createPacketZip(applicationId: string): Promise<Buffer> {
    try {
      const documents = await this.generatePacketDocuments(applicationId);

      if (documents.length === 0) {
        throw new Error('No documents available for packet creation');
      }

      return new Promise((resolve, reject) => {
        const archive = archiver('zip', {
          zlib: { level: 9 } // Maximum compression
        });

        const chunks: Buffer[] = [];

        archive.on('data', (chunk) => {
          chunks.push(chunk);
        });

        archive.on('end', () => {
          const zipBuffer = Buffer.concat(chunks);
          logger.info(`Created packet zip for application ${applicationId}, size: ${zipBuffer.length} bytes`);
          resolve(zipBuffer);
        });

        archive.on('error', (error) => {
          logger.error(`Failed to create packet zip for ${applicationId}:`, error);
          reject(error);
        });

        // Add each document to the zip
        documents.forEach(doc => {
          archive.append(doc.buffer, { name: doc.name });
        });

        // Finalize the archive
        archive.finalize();
      });

    } catch (error) {
      logger.error(`Failed to create packet zip for ${applicationId}:`, error);
      throw error;
    }
  }

  /**
   * Get packet filename for download
   */
  getPacketFilename(applicationId: string): string {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `Case_Packet_${applicationId}_${timestamp}.zip`;
  }
}

export const packetService = new PacketService();
