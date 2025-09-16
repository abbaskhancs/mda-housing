"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.STORAGE_BASE_PATH = exports.getFileUrl = exports.deleteFile = exports.uploadFile = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("./logger");
// Local file storage configuration
const STORAGE_BASE_PATH = process.env.LOCAL_STORAGE_PATH || './uploads';
exports.STORAGE_BASE_PATH = STORAGE_BASE_PATH;
// Ensure storage directory exists
const ensureStorageDirectoryExists = async () => {
    try {
        if (!fs_1.default.existsSync(STORAGE_BASE_PATH)) {
            fs_1.default.mkdirSync(STORAGE_BASE_PATH, { recursive: true });
            logger_1.logger.info(`Created storage directory: ${STORAGE_BASE_PATH}`);
        }
    }
    catch (error) {
        logger_1.logger.error('Error ensuring storage directory exists:', error);
        throw error;
    }
};
// Initialize storage directory on startup
ensureStorageDirectoryExists().catch(error => {
    logger_1.logger.error('Failed to initialize local storage directory:', error);
});
const uploadFile = async (file, applicationId, docType) => {
    try {
        const timestamp = Date.now();
        const fileExtension = file.originalname.split('.').pop() || '';
        const fileName = `${docType}_${timestamp}.${fileExtension}`;
        const relativePath = `applications/${applicationId}/attachments`;
        const fullDirectoryPath = path_1.default.join(STORAGE_BASE_PATH, relativePath);
        const filePath = path_1.default.join(fullDirectoryPath, fileName);
        const relativeFilePath = path_1.default.join(relativePath, fileName).replace(/\\/g, '/');
        // Ensure directory exists
        if (!fs_1.default.existsSync(fullDirectoryPath)) {
            fs_1.default.mkdirSync(fullDirectoryPath, { recursive: true });
        }
        // Write file to local storage
        fs_1.default.writeFileSync(filePath, file.buffer);
        // Generate file URL (assuming we'll serve files from /uploads endpoint)
        const fileUrl = `${process.env.BASE_URL || 'http://localhost:3001'}/uploads/${relativeFilePath}`;
        logger_1.logger.info(`File uploaded successfully to local storage: ${relativeFilePath}`);
        return {
            url: fileUrl,
            key: relativeFilePath,
            size: file.size,
        };
    }
    catch (error) {
        logger_1.logger.error('Error uploading file to local storage:', error);
        throw error;
    }
};
exports.uploadFile = uploadFile;
const deleteFile = async (relativePath) => {
    try {
        const fullPath = path_1.default.join(STORAGE_BASE_PATH, relativePath);
        if (fs_1.default.existsSync(fullPath)) {
            fs_1.default.unlinkSync(fullPath);
            logger_1.logger.info(`File deleted successfully from local storage: ${relativePath}`);
        }
    }
    catch (error) {
        logger_1.logger.error('Error deleting file from local storage:', error);
        throw error;
    }
};
exports.deleteFile = deleteFile;
const getFileUrl = (relativePath) => {
    return `${process.env.BASE_URL || 'http://localhost:3001'}/uploads/${relativePath}`;
};
exports.getFileUrl = getFileUrl;
