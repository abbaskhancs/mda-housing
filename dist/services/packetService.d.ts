export interface PacketDocument {
    name: string;
    buffer: Buffer;
    type: string;
}
export declare class PacketService {
    private documentService;
    constructor();
    /**
     * Generate all required documents for a case packet
     * Documents #1-#5: Intake Receipt, Clearances (BCA, Housing, Accounts), Challan, Memo, Deed
     */
    generatePacketDocuments(applicationId: string): Promise<PacketDocument[]>;
    /**
     * Generate clearance document for specific section
     */
    private generateClearanceDocument;
    /**
     * Create a zip file containing all packet documents
     */
    createPacketZip(applicationId: string): Promise<Buffer>;
    /**
     * Get packet filename for download
     */
    getPacketFilename(applicationId: string): string;
}
export declare const packetService: PacketService;
