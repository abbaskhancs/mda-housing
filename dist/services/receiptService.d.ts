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
export declare const generateIntakeReceipt: (applicationId: string) => Promise<string>;
export declare const createReceiptRecord: (applicationId: string, receiptUrl: string) => Promise<void>;
