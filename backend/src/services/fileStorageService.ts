import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../config/logger';

export interface FileStorageConfig {
  storagePath: string;
  baseUrl: string;
}

export class FileStorageService {
  private storagePath: string;
  private baseUrl: string;

  constructor(config: FileStorageConfig) {
    this.storagePath = config.storagePath;
    this.baseUrl = config.baseUrl;
  }

  async initialize(): Promise<void> {
    try {
      // Create storage directory if it doesn't exist
      await fs.mkdir(this.storagePath, { recursive: true });
      logger.info(`File storage initialized at: ${this.storagePath}`);
    } catch (error) {
      logger.error('Failed to initialize file storage:', error);
      throw error;
    }
  }

  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    contentType: string = 'application/pdf',
    metadata?: Record<string, string>
  ): Promise<{ url: string; hash: string; filePath: string }> {
    try {
      // Generate file hash
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      
      // Generate unique file path
      const timestamp = Date.now();
      const randomId = crypto.randomBytes(8).toString('hex');
      const filePath = path.join(this.storagePath, `documents`, `${timestamp}-${randomId}-${fileName}`);
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // Write file to disk
      await fs.writeFile(filePath, fileBuffer);

      // Generate URL
      const relativePath = path.relative(this.storagePath, filePath).replace(/\\/g, '/');
      const url = `${this.baseUrl}/storage/${relativePath}`;
      
      logger.info(`File uploaded successfully: ${filePath}`);
      return { url, hash, filePath };
    } catch (error) {
      logger.error('Failed to upload file:', error);
      throw error;
    }
  }

  async downloadFile(filePath: string): Promise<Buffer> {
    try {
      const fullPath = path.join(this.storagePath, filePath);
      const buffer = await fs.readFile(fullPath);
      logger.info(`File downloaded successfully: ${filePath}`);
      return buffer;
    } catch (error) {
      logger.error('Failed to download file:', error);
      throw error;
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.storagePath, filePath);
      await fs.unlink(fullPath);
      logger.info(`File deleted successfully: ${filePath}`);
    } catch (error) {
      logger.error('Failed to delete file:', error);
      throw error;
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.storagePath, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async getFileInfo(filePath: string): Promise<{ size: number; mtime: Date }> {
    try {
      const fullPath = path.join(this.storagePath, filePath);
      const stats = await fs.stat(fullPath);
      return {
        size: stats.size,
        mtime: stats.mtime
      };
    } catch (error) {
      logger.error('Failed to get file info:', error);
      throw error;
    }
  }

  // Generate download URL with signature
  generateDownloadUrl(documentId: string, expiresIn: number = 3600): string {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    const signature = this.generateSignature(documentId, expiresIn);
    return `${baseUrl}/api/documents/${documentId}/download?signature=${signature}&expires=${Date.now() + (expiresIn * 1000)}`;
  }

  // Generate signature for URL verification
  public generateSignature(documentId: string, expiresIn: number): string {
    const secret = process.env.DOCUMENT_SIGNATURE_SECRET || 'default-secret-key';
    const expires = Date.now() + (expiresIn * 1000);
    const data = `${documentId}:${expires}`;
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  // Verify signature
  verifySignature(documentId: string, signature: string, expires: number): boolean {
    try {
      const secret = process.env.DOCUMENT_SIGNATURE_SECRET || 'default-secret-key';
      const data = `${documentId}:${expires}`;
      const expectedSignature = crypto.createHmac('sha256', secret).update(data).digest('hex');
      
      // Check if signature matches and not expired
      const isSignatureValid = crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
      
      const isNotExpired = Date.now() < expires;
      
      return isSignatureValid && isNotExpired;
    } catch (error) {
      logger.error('Failed to verify signature:', error);
      return false;
    }
  }

  // Extract file path from URL
  extractFilePath(url: string): string {
    const urlPath = url.replace(`${this.baseUrl}/storage/`, '');
    return urlPath;
  }
}

// Create file storage service instance
const fileStorageConfig: FileStorageConfig = {
  storagePath: path.join(process.cwd(), 'storage'),
  baseUrl: process.env.API_BASE_URL || 'http://localhost:3001'
};

export const fileStorageService = new FileStorageService(fileStorageConfig);
