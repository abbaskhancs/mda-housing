"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = exports.StorageService = void 0;
const minio_1 = require("minio");
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../config/logger");
class StorageService {
    constructor(config) {
        this.config = config;
        this.bucketName = config.bucketName;
        this.client = new minio_1.Client({
            endPoint: config.endPoint,
            port: config.port,
            useSSL: config.useSSL,
            accessKey: config.accessKey,
            secretKey: config.secretKey,
        });
    }
    async initialize() {
        try {
            // Check if bucket exists, create if not
            const bucketExists = await this.client.bucketExists(this.bucketName);
            if (!bucketExists) {
                await this.client.makeBucket(this.bucketName, 'us-east-1');
                logger_1.logger.info(`Created bucket: ${this.bucketName}`);
            }
            logger_1.logger.info(`Storage service initialized with bucket: ${this.bucketName}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize storage service:', error);
            throw error;
        }
    }
    async uploadFile(fileBuffer, fileName, contentType = 'application/pdf', metadata) {
        try {
            // Generate file hash
            const hash = crypto_1.default.createHash('sha256').update(fileBuffer).digest('hex');
            // Generate unique file path
            const timestamp = Date.now();
            const randomId = crypto_1.default.randomBytes(8).toString('hex');
            const filePath = `documents/${timestamp}-${randomId}-${fileName}`;
            // Upload file
            await this.client.putObject(this.bucketName, filePath, fileBuffer, fileBuffer.length, {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${fileName}"`,
                ...metadata
            });
            const url = `${this.config.endPoint}:${this.config.port}/${this.bucketName}/${filePath}`;
            logger_1.logger.info(`File uploaded successfully: ${filePath}`);
            return { url, hash };
        }
        catch (error) {
            logger_1.logger.error('Failed to upload file:', error);
            throw error;
        }
    }
    async generateSignedUrl(objectName, expiresInSeconds = 3600 // 1 hour default
    ) {
        try {
            const signedUrl = await this.client.presignedGetObject(this.bucketName, objectName, expiresInSeconds);
            logger_1.logger.info(`Generated signed URL for: ${objectName}`);
            return signedUrl;
        }
        catch (error) {
            logger_1.logger.error('Failed to generate signed URL:', error);
            throw error;
        }
    }
    async deleteFile(objectName) {
        try {
            await this.client.removeObject(this.bucketName, objectName);
            logger_1.logger.info(`File deleted successfully: ${objectName}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to delete file:', error);
            throw error;
        }
    }
    async getFileInfo(objectName) {
        try {
            const stat = await this.client.statObject(this.bucketName, objectName);
            return stat;
        }
        catch (error) {
            logger_1.logger.error('Failed to get file info:', error);
            throw error;
        }
    }
    // Extract object name from full URL
    extractObjectName(url) {
        const urlParts = url.split('/');
        return urlParts.slice(4).join('/'); // Remove protocol, domain, port, bucket
    }
    // Generate download URL with signature
    generateDownloadUrl(documentId, expiresIn = 3600) {
        const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
        const signature = this.generateSignature(documentId, expiresIn);
        return `${baseUrl}/api/documents/${documentId}/download?signature=${signature}&expires=${Date.now() + (expiresIn * 1000)}`;
    }
    // Generate signature for URL verification
    generateSignature(documentId, expiresIn) {
        const secret = process.env.DOCUMENT_SIGNATURE_SECRET || 'default-secret-key';
        const data = `${documentId}:${Date.now() + (expiresIn * 1000)}`;
        return crypto_1.default.createHmac('sha256', secret).update(data).digest('hex');
    }
    // Verify signature
    verifySignature(documentId, signature, expires) {
        try {
            const secret = process.env.DOCUMENT_SIGNATURE_SECRET || 'default-secret-key';
            const data = `${documentId}:${expires}`;
            const expectedSignature = crypto_1.default.createHmac('sha256', secret).update(data).digest('hex');
            // Check if signature matches and not expired
            const isSignatureValid = crypto_1.default.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
            const isNotExpired = Date.now() < expires;
            return isSignatureValid && isNotExpired;
        }
        catch (error) {
            logger_1.logger.error('Failed to verify signature:', error);
            return false;
        }
    }
}
exports.StorageService = StorageService;
// Create storage service instance
const storageConfig = {
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    bucketName: process.env.MINIO_BUCKET_NAME || 'mda-housing-documents'
};
exports.storageService = new StorageService(storageConfig);
