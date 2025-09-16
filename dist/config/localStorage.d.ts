declare const STORAGE_BASE_PATH: string;
export interface UploadResult {
    url: string;
    key: string;
    size: number;
    hash?: string;
}
export declare const uploadFile: (file: Express.Multer.File, applicationId: string, docType: string) => Promise<UploadResult>;
export declare const deleteFile: (relativePath: string) => Promise<void>;
export declare const getFileUrl: (relativePath: string) => string;
export { STORAGE_BASE_PATH };
