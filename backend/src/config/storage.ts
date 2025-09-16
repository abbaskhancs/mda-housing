import { Client } from 'minio';
import { logger } from './logger';
import * as localStorage from './localStorage';

// Storage configuration - use MinIO if available, otherwise use local storage
const USE_MINIO = process.env.USE_MINIO === 'true';

// MinIO/S3 Configuration
let minioClient: Client | null = null;
if (USE_MINIO) {
  minioClient = new Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  });
}

const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'mda-housing-documents';

// Ensure bucket exists (only if using MinIO)
const ensureBucketExists = async (): Promise<void> => {
  if (!USE_MINIO || !minioClient) {
    logger.info('Using local file storage instead of MinIO');
    return;
  }

  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
      logger.info(`Created bucket: ${BUCKET_NAME}`);
    }
  } catch (error) {
    logger.error('Error ensuring bucket exists:', error);
    logger.warn('Falling back to local file storage');
    // Don't throw error, just log and continue with local storage
  }
};

// Initialize bucket on startup (only if using MinIO)
if (USE_MINIO) {
  ensureBucketExists().catch(error => {
    logger.error('Failed to initialize MinIO bucket:', error);
    logger.warn('Will use local file storage instead');
  });
}

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  hash?: string;
}

export const uploadFile = async (
  file: Express.Multer.File,
  applicationId: string,
  docType: string
): Promise<UploadResult> => {
  // Use local storage if MinIO is not available or configured
  if (!USE_MINIO || !minioClient) {
    return localStorage.uploadFile(file, applicationId, docType);
  }

  try {
    const timestamp = Date.now();
    const fileExtension = file.originalname.split('.').pop() || '';
    const fileName = `${docType}_${timestamp}.${fileExtension}`;
    const objectName = `applications/${applicationId}/attachments/${fileName}`;

    // Upload file to MinIO
    const uploadResult = await minioClient.putObject(
      BUCKET_NAME,
      objectName,
      file.buffer,
      file.size,
      {
        'Content-Type': file.mimetype,
        'Content-Disposition': `attachment; filename="${file.originalname}"`,
        'X-Original-Name': file.originalname,
        'X-Doc-Type': docType,
        'X-Application-Id': applicationId,
      }
    );

    // Generate file URL
    const fileUrl = `${process.env.MINIO_PUBLIC_URL || `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || '9000'}`}/${BUCKET_NAME}/${objectName}`;

    logger.info(`File uploaded successfully to MinIO: ${objectName}`);

    return {
      url: fileUrl,
      key: objectName,
      size: file.size,
    };
  } catch (error) {
    logger.error('Error uploading file to MinIO, falling back to local storage:', error);
    // Fallback to local storage
    return localStorage.uploadFile(file, applicationId, docType);
  }
};

export const deleteFile = async (objectName: string): Promise<void> => {
  // Use local storage if MinIO is not available or configured
  if (!USE_MINIO || !minioClient) {
    return localStorage.deleteFile(objectName);
  }

  try {
    await minioClient.removeObject(BUCKET_NAME, objectName);
    logger.info(`File deleted successfully from MinIO: ${objectName}`);
  } catch (error) {
    logger.error('Error deleting file from MinIO, trying local storage:', error);
    // Fallback to local storage
    return localStorage.deleteFile(objectName);
  }
};

export const getFileUrl = (objectName: string): string => {
  // Use local storage if MinIO is not available or configured
  if (!USE_MINIO || !minioClient) {
    return localStorage.getFileUrl(objectName);
  }

  return `${process.env.MINIO_PUBLIC_URL || `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || '9000'}`}/${BUCKET_NAME}/${objectName}`;
};

export { minioClient, BUCKET_NAME };
