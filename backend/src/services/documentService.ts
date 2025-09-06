import { PrismaClient } from '@prisma/client';
import { pdfService, PDFTemplateData } from './pdfService';
import { fileStorageService } from './fileStorageService';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export interface DocumentGenerationRequest {
  applicationId: string;
  documentType: 'INTAKE_RECEIPT' | 'BCA_CLEARANCE' | 'HOUSING_CLEARANCE' | 'CHALLAN' | 'DISPATCH_MEMO' | 'TRANSFER_DEED';
  templateData: PDFTemplateData;
  expiresInHours?: number;
}

export interface DocumentResponse {
  id: string;
  documentType: string;
  fileName: string;
  downloadUrl: string;
  expiresAt: Date;
  hashSha256: string;
  fileSize: number;
}

export class DocumentService {
  async generateDocument(request: DocumentGenerationRequest): Promise<DocumentResponse> {
    try {
      const { applicationId, documentType, templateData, expiresInHours = 24 } = request;

      // Generate PDF
      let pdfBuffer: Buffer;
      const fileName = this.generateFileName(applicationId, documentType);

      switch (documentType) {
        case 'INTAKE_RECEIPT':
          pdfBuffer = await pdfService.generateIntakeReceipt(templateData);
          break;
        case 'BCA_CLEARANCE':
          pdfBuffer = await pdfService.generateClearanceCertificate({
            ...templateData,
            sectionName: 'BCA'
          });
          break;
        case 'HOUSING_CLEARANCE':
          pdfBuffer = await pdfService.generateClearanceCertificate({
            ...templateData,
            sectionName: 'HOUSING'
          });
          break;
        case 'CHALLAN':
          pdfBuffer = await pdfService.generateChallan(templateData);
          break;
        case 'DISPATCH_MEMO':
          pdfBuffer = await pdfService.generateDispatchMemo({
            ...templateData,
            memoId: `MEMO-${Date.now()}`,
            memoDate: new Date()
          });
          break;
        case 'TRANSFER_DEED':
          pdfBuffer = await pdfService.generateTransferDeed(templateData);
          break;
        default:
          throw new Error(`Unsupported document type: ${documentType}`);
      }

      // Upload to file storage
      const { url: storageUrl, hash, filePath } = await fileStorageService.uploadFile(
        pdfBuffer,
        fileName,
        'application/pdf',
        {
          'application-id': applicationId,
          'document-type': documentType,
          'generated-at': new Date().toISOString()
        }
      );

      // Generate signed download URL
      const expiresAt = new Date(Date.now() + (expiresInHours * 60 * 60 * 1000));
      const downloadUrl = fileStorageService.generateDownloadUrl(applicationId, expiresInHours * 3600);

      // Save to database
      const document = await prisma.document.upsert({
        where: {
          applicationId_documentType: {
            applicationId,
            documentType
          }
        },
        update: {
          fileName,
          originalName: fileName,
          fileSize: pdfBuffer.length,
          storageUrl,
          hashSha256: hash,
          signedUrl: downloadUrl,
          expiresAt,
          updatedAt: new Date()
        },
        create: {
          applicationId,
          documentType,
          fileName,
          originalName: fileName,
          fileSize: pdfBuffer.length,
          storageUrl,
          hashSha256: hash,
          signedUrl: downloadUrl,
          expiresAt
        }
      });

      logger.info(`Document generated successfully: ${documentType} for application ${applicationId}`);

      return {
        id: document.id,
        documentType: document.documentType,
        fileName: document.fileName,
        downloadUrl: document.signedUrl!,
        expiresAt: document.expiresAt!,
        hashSha256: document.hashSha256,
        fileSize: document.fileSize
      };

    } catch (error) {
      logger.error('Failed to generate document:', error);
      throw error;
    }
  }

  async generateAllDocuments(applicationId: string, templateData: PDFTemplateData): Promise<DocumentResponse[]> {
    const documentTypes: Array<DocumentGenerationRequest['documentType']> = [
      'INTAKE_RECEIPT',
      'BCA_CLEARANCE',
      'HOUSING_CLEARANCE',
      'CHALLAN',
      'DISPATCH_MEMO',
      'TRANSFER_DEED'
    ];

    const results: DocumentResponse[] = [];

    for (const documentType of documentTypes) {
      try {
        // Check if document should be generated based on application state
        if (this.shouldGenerateDocument(applicationId, documentType, templateData)) {
          const document = await this.generateDocument({
            applicationId,
            documentType,
            templateData
          });
          results.push(document);
        }
      } catch (error) {
        logger.error(`Failed to generate ${documentType}:`, error);
        // Continue with other documents
      }
    }

    return results;
  }

  async getDocument(documentId: string): Promise<DocumentResponse | null> {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId }
      });

      if (!document) {
        return null;
      }

      // Check if URL is expired and regenerate if needed
      let downloadUrl = document.signedUrl;
      if (!document.expiresAt || new Date() > document.expiresAt) {
        const expiresInHours = 24;
        downloadUrl = fileStorageService.generateDownloadUrl(documentId, expiresInHours * 3600);
        const expiresAt = new Date(Date.now() + (expiresInHours * 60 * 60 * 1000));

        await prisma.document.update({
          where: { id: documentId },
          data: {
            signedUrl: downloadUrl,
            expiresAt
          }
        });
      }

      return {
        id: document.id,
        documentType: document.documentType,
        fileName: document.fileName,
        downloadUrl: downloadUrl!,
        expiresAt: document.expiresAt!,
        hashSha256: document.hashSha256,
        fileSize: document.fileSize
      };
    } catch (error) {
      logger.error('Failed to get document:', error);
      throw error;
    }
  }

  async getApplicationDocuments(applicationId: string): Promise<DocumentResponse[]> {
    try {
      const documents = await prisma.document.findMany({
        where: { applicationId },
        orderBy: { createdAt: 'desc' }
      });

      return documents.map(doc => ({
        id: doc.id,
        documentType: doc.documentType,
        fileName: doc.fileName,
        downloadUrl: doc.signedUrl || '',
        expiresAt: doc.expiresAt || new Date(),
        hashSha256: doc.hashSha256,
        fileSize: doc.fileSize
      }));
    } catch (error) {
      logger.error('Failed to get application documents:', error);
      throw error;
    }
  }

  async verifyDownloadAccess(documentId: string, signature: string, expires: number): Promise<boolean> {
    try {
      return fileStorageService.verifySignature(documentId, signature, expires);
    } catch (error) {
      logger.error('Failed to verify download access:', error);
      return false;
    }
  }

  async downloadDocument(documentId: string): Promise<Buffer> {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId }
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Extract file path from storage URL
      const filePath = fileStorageService.extractFilePath(document.storageUrl);
      
      // Get file from storage
      const buffer = await fileStorageService.downloadFile(filePath);
      
      return buffer;

    } catch (error) {
      logger.error('Failed to download document:', error);
      throw error;
    }
  }

  public generateFileName(applicationId: string, documentType: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const typeMap: { [key: string]: string } = {
      'INTAKE_RECEIPT': 'intake-receipt',
      'BCA_CLEARANCE': 'bca-clearance',
      'HOUSING_CLEARANCE': 'housing-clearance',
      'CHALLAN': 'challan',
      'DISPATCH_MEMO': 'dispatch-memo',
      'TRANSFER_DEED': 'transfer-deed'
    };
    
    const typeSlug = typeMap[documentType] || documentType.toLowerCase();
    return `${applicationId}-${typeSlug}-${timestamp}.pdf`;
  }

  private shouldGenerateDocument(
    applicationId: string, 
    documentType: string, 
    templateData: PDFTemplateData
  ): boolean {
    // Logic to determine if document should be generated based on application state
    switch (documentType) {
      case 'INTAKE_RECEIPT':
        return true; // Always generate for new applications
      case 'BCA_CLEARANCE':
        return templateData.clearances?.some(c => c.section === 'BCA') || false;
      case 'HOUSING_CLEARANCE':
        return templateData.clearances?.some(c => c.section === 'HOUSING') || false;
      case 'CHALLAN':
        return !!templateData.accountsBreakdown;
      case 'DISPATCH_MEMO':
        return templateData.application?.currentStage === 'READY_FOR_APPROVAL';
      case 'TRANSFER_DEED':
        return !!templateData.transferDeed;
      default:
        return false;
    }
  }
}

export const documentService = new DocumentService();
