"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUCKET_NAME = exports.minioClient = exports.getFileUrl = exports.deleteFile = exports.uploadFile = void 0;
const minio_1 = require("minio");
const logger_1 = require("./logger");
// MinIO/S3 Configuration
const minioClient = new minio_1.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});
exports.minioClient = minioClient;
const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'mda-housing-documents';
exports.BUCKET_NAME = BUCKET_NAME;
// Ensure bucket exists
const ensureBucketExists = async () => {
    try {
        const exists = await minioClient.bucketExists(BUCKET_NAME);
        if (!exists) {
            await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
            logger_1.logger.info(`Created bucket: ${BUCKET_NAME}`);
        }
    }
    catch (error) {
        logger_1.logger.error('Error ensuring bucket exists:', error);
        throw error;
    }
};
// Initialize bucket on startup
ensureBucketExists().catch(error => {
    logger_1.logger.error('Failed to initialize MinIO bucket:', error);
});
const uploadFile = async (file, applicationId, docType) => {
    try {
        const timestamp = Date.now();
        const fileExtension = file.originalname.split('.').pop() || '';
        const fileName = `${docType}_${timestamp}.${fileExtension}`;
        const objectName = `applications/${applicationId}/attachments/${fileName}`;
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
        logger_1.logger.info(`File uploaded successfully: ${objectName}`);
        return {
            url: fileUrl,
            key: objectName,
            size: file.size,
        };
    }
    catch (error) {
        logger_1.logger.error('Error uploading file:', error);
        throw error;
    }
};
exports.uploadFile = uploadFile;
const deleteFile = async (objectName) => {
    try {
        await minioClient.removeObject(BUCKET_NAME, objectName);
        logger_1.logger.info(`File deleted successfully: ${objectName}`);
    }
    catch (error) {
        logger_1.logger.error('Error deleting file:', error);
        throw error;
    }
};
exports.deleteFile = deleteFile;
const getFileUrl = (objectName) => {
    return `${process.env.MINIO_PUBLIC_URL || `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || '9000'}`}/${BUCKET_NAME}/${objectName}`;
};
exports.getFileUrl = getFileUrl;
