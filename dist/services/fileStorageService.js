"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileStorageService = exports.FileStorageService = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../config/logger");
class FileStorageService {
    constructor(config) {
        this.storagePath = config.storagePath;
        this.baseUrl = config.baseUrl;
    }
    async initialize() {
        try {
            // Create storage directory if it doesn't exist
            await promises_1.default.mkdir(this.storagePath, { recursive: true });
            logger_1.logger.info(`File storage initialized at: ${this.storagePath}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize file storage:', error);
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
            const filePath = path_1.default.join(this.storagePath, `documents`, `${timestamp}-${randomId}-${fileName}`);
            // Ensure directory exists
            await promises_1.default.mkdir(path_1.default.dirname(filePath), { recursive: true });
            // Write file to disk
            await promises_1.default.writeFile(filePath, fileBuffer);
            // Generate URL
            const relativePath = path_1.default.relative(this.storagePath, filePath).replace(/\\/g, '/');
            const url = `${this.baseUrl}/storage/${relativePath}`;
            logger_1.logger.info(`File uploaded successfully: ${filePath}`);
            return { url, hash, filePath };
        }
        catch (error) {
            logger_1.logger.error('Failed to upload file:', error);
            throw error;
        }
    }
    async downloadFile(filePath) {
        try {
            const fullPath = path_1.default.join(this.storagePath, filePath);
            const buffer = await promises_1.default.readFile(fullPath);
            logger_1.logger.info(`File downloaded successfully: ${filePath}`);
            return buffer;
        }
        catch (error) {
            logger_1.logger.error('Failed to download file:', error);
            throw error;
        }
    }
    async deleteFile(filePath) {
        try {
            const fullPath = path_1.default.join(this.storagePath, filePath);
            await promises_1.default.unlink(fullPath);
            logger_1.logger.info(`File deleted successfully: ${filePath}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to delete file:', error);
            throw error;
        }
    }
    async fileExists(filePath) {
        try {
            const fullPath = path_1.default.join(this.storagePath, filePath);
            await promises_1.default.access(fullPath);
            return true;
        }
        catch {
            return false;
        }
    }
    async getFileInfo(filePath) {
        try {
            const fullPath = path_1.default.join(this.storagePath, filePath);
            const stats = await promises_1.default.stat(fullPath);
            return {
                size: stats.size,
                mtime: stats.mtime
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get file info:', error);
            throw error;
        }
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
        const expires = Date.now() + (expiresIn * 1000);
        const data = `${documentId}:${expires}`;
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
    // Extract file path from URL
    extractFilePath(url) {
        const urlPath = url.replace(`${this.baseUrl}/storage/`, '');
        return urlPath;
    }
}
exports.FileStorageService = FileStorageService;
// Create file storage service instance
const fileStorageConfig = {
    storagePath: path_1.default.join(process.cwd(), 'storage'),
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3001'
};
exports.fileStorageService = new FileStorageService(fileStorageConfig);
