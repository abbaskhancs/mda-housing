import { PDFTemplateData } from './pdfService';
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
export declare class DocumentService {
    generateDocument(request: DocumentGenerationRequest): Promise<DocumentResponse>;
    generateAllDocuments(applicationId: string, templateData: PDFTemplateData): Promise<DocumentResponse[]>;
    getDocument(documentId: string): Promise<DocumentResponse | null>;
    getApplicationDocuments(applicationId: string): Promise<DocumentResponse[]>;
    verifyDownloadAccess(documentId: string, signature: string, expires: number): Promise<boolean>;
    downloadDocument(documentId: string): Promise<Buffer>;
    generateFileName(applicationId: string, documentType: string): string;
    private shouldGenerateDocument;
}
export declare const documentService: DocumentService;
