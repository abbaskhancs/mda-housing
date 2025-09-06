import { Client } from 'minio';
import { logger } from './logger';

// MinIO/S3 Configuration
const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'mda-housing-documents';

// Ensure bucket exists
const ensureBucketExists = async (): Promise<void> => {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
      logger.info(`Created bucket: ${BUCKET_NAME}`);
    }
  } catch (error) {
    logger.error('Error ensuring bucket exists:', error);
    throw error;
  }
};

// Initialize bucket on startup
ensureBucketExists().catch(error => {
  logger.error('Failed to initialize MinIO bucket:', error);
});

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

    logger.info(`File uploaded successfully: ${objectName}`);

    return {
      url: fileUrl,
      key: objectName,
      size: file.size,
    };
  } catch (error) {
    logger.error('Error uploading file:', error);
    throw error;
  }
};

export const deleteFile = async (objectName: string): Promise<void> => {
  try {
    await minioClient.removeObject(BUCKET_NAME, objectName);
    logger.info(`File deleted successfully: ${objectName}`);
  } catch (error) {
    logger.error('Error deleting file:', error);
    throw error;
  }
};

export const getFileUrl = (objectName: string): string => {
  return `${process.env.MINIO_PUBLIC_URL || `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || '9000'}`}/${BUCKET_NAME}/${objectName}`;
};

export { minioClient, BUCKET_NAME };
