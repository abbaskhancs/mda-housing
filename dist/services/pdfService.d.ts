export interface PDFTemplateData {
    application: any;
    plot?: any;
    attachments?: any[];
    clearances?: any[];
    reviews?: any[];
    accountsBreakdown?: any;
    transferDeed?: any;
    witness1?: any;
    witness2?: any;
    sectionName?: string;
    memoId?: string;
    memoDate?: Date;
    [key: string]: any;
}
export declare class PDFService {
    private browser;
    private templatesDir;
    constructor();
    private registerHandlebarsHelpers;
    initialize(): Promise<void>;
    close(): Promise<void>;
    private generateQRCode;
    private loadTemplate;
    private renderTemplate;
    generatePDF(templateName: string, data: PDFTemplateData, options?: {
        format?: 'A4' | 'Letter';
        margin?: {
            top?: string;
            right?: string;
            bottom?: string;
            left?: string;
        };
        displayHeaderFooter?: boolean;
        headerTemplate?: string;
        footerTemplate?: string;
    }): Promise<Buffer>;
    generateIntakeReceipt(data: PDFTemplateData): Promise<Buffer>;
    generateClearanceCertificate(data: PDFTemplateData): Promise<Buffer>;
    generateChallan(data: PDFTemplateData): Promise<Buffer>;
    generateDispatchMemo(data: PDFTemplateData): Promise<Buffer>;
    generateTransferDeed(data: PDFTemplateData): Promise<Buffer>;
    generateAllDocuments(applicationData: PDFTemplateData): Promise<{
        intakeReceipt?: Buffer;
        clearanceBCA?: Buffer;
        clearanceHousing?: Buffer;
        challan?: Buffer;
        dispatchMemo?: Buffer;
        transferDeed?: Buffer;
    }>;
}
export declare const pdfService: PDFService;
