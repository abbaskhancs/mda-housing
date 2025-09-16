import fs from 'fs';
import path from 'path';
import { logger } from './logger';

// Local file storage configuration
const STORAGE_BASE_PATH = process.env.LOCAL_STORAGE_PATH || './uploads';

// Ensure storage directory exists
const ensureStorageDirectoryExists = async (): Promise<void> => {
  try {
    if (!fs.existsSync(STORAGE_BASE_PATH)) {
      fs.mkdirSync(STORAGE_BASE_PATH, { recursive: true });
      logger.info(`Created storage directory: ${STORAGE_BASE_PATH}`);
    }
  } catch (error) {
    logger.error('Error ensuring storage directory exists:', error);
    throw error;
  }
};

// Initialize storage directory on startup
ensureStorageDirectoryExists().catch(error => {
  logger.error('Failed to initialize local storage directory:', error);
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
    const relativePath = `applications/${applicationId}/attachments`;
    const fullDirectoryPath = path.join(STORAGE_BASE_PATH, relativePath);
    const filePath = path.join(fullDirectoryPath, fileName);
    const relativeFilePath = path.join(relativePath, fileName).replace(/\\/g, '/');

    // Ensure directory exists
    if (!fs.existsSync(fullDirectoryPath)) {
      fs.mkdirSync(fullDirectoryPath, { recursive: true });
    }

    // Write file to local storage
    fs.writeFileSync(filePath, file.buffer);

    // Generate file URL (assuming we'll serve files from /uploads endpoint)
    const fileUrl = `${process.env.BASE_URL || 'http://localhost:3001'}/uploads/${relativeFilePath}`;

    logger.info(`File uploaded successfully to local storage: ${relativeFilePath}`);

    return {
      url: fileUrl,
      key: relativeFilePath,
      size: file.size,
    };
  } catch (error) {
    logger.error('Error uploading file to local storage:', error);
    throw error;
  }
};

export const deleteFile = async (relativePath: string): Promise<void> => {
  try {
    const fullPath = path.join(STORAGE_BASE_PATH, relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      logger.info(`File deleted successfully from local storage: ${relativePath}`);
    }
  } catch (error) {
    logger.error('Error deleting file from local storage:', error);
    throw error;
  }
};

export const getFileUrl = (relativePath: string): string => {
  return `${process.env.BASE_URL || 'http://localhost:3001'}/uploads/${relativePath}`;
};

export { STORAGE_BASE_PATH };
