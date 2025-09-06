import { Client } from 'minio';
export interface StorageConfig {
    endPoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
    bucketName: string;
}
export declare class StorageService {
    client: Client;
    private bucketName;
    private config;
    constructor(config: StorageConfig);
    initialize(): Promise<void>;
    uploadFile(fileBuffer: Buffer, fileName: string, contentType?: string, metadata?: Record<string, string>): Promise<{
        url: string;
        hash: string;
    }>;
    generateSignedUrl(objectName: string, expiresInSeconds?: number): Promise<string>;
    deleteFile(objectName: string): Promise<void>;
    getFileInfo(objectName: string): Promise<any>;
    extractObjectName(url: string): string;
    generateDownloadUrl(documentId: string, expiresIn?: number): string;
    generateSignature(documentId: string, expiresIn: number): string;
    verifySignature(documentId: string, signature: string, expires: number): boolean;
}
export declare const storageService: StorageService;
