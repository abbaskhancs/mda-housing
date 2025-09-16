"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUCKET_NAME = exports.minioClient = exports.getFileUrl = exports.deleteFile = exports.uploadFile = void 0;
const minio_1 = require("minio");
const logger_1 = require("./logger");
const localStorage = __importStar(require("./localStorage"));
// Storage configuration - use MinIO if available, otherwise use local storage
const USE_MINIO = process.env.USE_MINIO === 'true';
// MinIO/S3 Configuration
let minioClient = null;
exports.minioClient = minioClient;
if (USE_MINIO) {
    exports.minioClient = minioClient = new minio_1.Client({
        endPoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: parseInt(process.env.MINIO_PORT || '9000'),
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });
}
const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'mda-housing-documents';
exports.BUCKET_NAME = BUCKET_NAME;
// Ensure bucket exists (only if using MinIO)
const ensureBucketExists = async () => {
    if (!USE_MINIO || !minioClient) {
        logger_1.logger.info('Using local file storage instead of MinIO');
        return;
    }
    try {
        const exists = await minioClient.bucketExists(BUCKET_NAME);
        if (!exists) {
            await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
            logger_1.logger.info(`Created bucket: ${BUCKET_NAME}`);
        }
    }
    catch (error) {
        logger_1.logger.error('Error ensuring bucket exists:', error);
        logger_1.logger.warn('Falling back to local file storage');
        // Don't throw error, just log and continue with local storage
    }
};
// Initialize bucket on startup (only if using MinIO)
if (USE_MINIO) {
    ensureBucketExists().catch(error => {
        logger_1.logger.error('Failed to initialize MinIO bucket:', error);
        logger_1.logger.warn('Will use local file storage instead');
    });
}
const uploadFile = async (file, applicationId, docType) => {
    // Use local storage if MinIO is not available or configured
    if (!USE_MINIO || !minioClient) {
        return localStorage.uploadFile(file, applicationId, docType);
    }
    try {
        const timestamp = Date.now();
        const fileExtension = file.originalname.split('.').pop() || '';
        const fileName = `${docType}_${timestamp}.${fileExtension}`;
        const objectName = `applications/${applicationId}/attachments/${fileName}`;
        // Generate file hash
        const hash = crypto_1.default.createHash('sha256').update(file.buffer).digest('hex');
        // Upload file to MinIO
        const uploadResult = await minioClient.putObject(BUCKET_NAME, objectName, file.buffer, file.size, {
            'Content-Type': file.mimetype,
            'Content-Disposition': `attachment; filename="${file.originalname}"`,
            'X-Original-Name': file.originalname,
            'X-Doc-Type': docType,
            'X-Application-Id': applicationId,
        });
        // Generate file URL
        const fileUrl = `${process.env.MINIO_PUBLIC_URL || `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || '9000'}`}/${BUCKET_NAME}/${objectName}`;
        logger_1.logger.info(`File uploaded successfully to MinIO: ${objectName}`);
        return {
            url: fileUrl,
            key: objectName,
            size: file.size,
            hash: hash,
        };
    }
    catch (error) {
        logger_1.logger.error('Error uploading file to MinIO, falling back to local storage:', error);
        // Fallback to local storage
        return localStorage.uploadFile(file, applicationId, docType);
    }
};
exports.uploadFile = uploadFile;
const deleteFile = async (objectName) => {
    // Use local storage if MinIO is not available or configured
    if (!USE_MINIO || !minioClient) {
        return localStorage.deleteFile(objectName);
    }
    try {
        await minioClient.removeObject(BUCKET_NAME, objectName);
        logger_1.logger.info(`File deleted successfully from MinIO: ${objectName}`);
    }
    catch (error) {
        logger_1.logger.error('Error deleting file from MinIO, trying local storage:', error);
        // Fallback to local storage
        return localStorage.deleteFile(objectName);
    }
};
exports.deleteFile = deleteFile;
const getFileUrl = (objectName) => {
    // Use local storage if MinIO is not available or configured
    if (!USE_MINIO || !minioClient) {
        return localStorage.getFileUrl(objectName);
    }
    return `${process.env.MINIO_PUBLIC_URL || `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || '9000'}`}/${BUCKET_NAME}/${objectName}`;
};
exports.getFileUrl = getFileUrl;
