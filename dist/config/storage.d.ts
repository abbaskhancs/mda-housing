import { Client } from 'minio';
declare const minioClient: Client;
declare const BUCKET_NAME: string;
export interface UploadResult {
    url: string;
    key: string;
    size: number;
    hash?: string;
}
export declare const uploadFile: (file: Express.Multer.File, applicationId: string, docType: string) => Promise<UploadResult>;
export declare const deleteFile: (objectName: string) => Promise<void>;
export declare const getFileUrl: (objectName: string) => string;
export { minioClient, BUCKET_NAME };
