export interface FileStorageConfig {
    storagePath: string;
    baseUrl: string;
}
export declare class FileStorageService {
    private storagePath;
    private baseUrl;
    constructor(config: FileStorageConfig);
    initialize(): Promise<void>;
    uploadFile(fileBuffer: Buffer, fileName: string, contentType?: string, metadata?: Record<string, string>): Promise<{
        url: string;
        hash: string;
        filePath: string;
    }>;
    downloadFile(filePath: string): Promise<Buffer>;
    deleteFile(filePath: string): Promise<void>;
    fileExists(filePath: string): Promise<boolean>;
    getFileInfo(filePath: string): Promise<{
        size: number;
        mtime: Date;
    }>;
    generateDownloadUrl(documentId: string, expiresIn?: number): string;
    generateSignature(documentId: string, expiresIn: number): string;
    verifySignature(documentId: string, signature: string, expires: number): boolean;
    extractFilePath(url: string): string;
}
export declare const fileStorageService: FileStorageService;
