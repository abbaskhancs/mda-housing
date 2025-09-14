import { Client } from 'minio';
import crypto from 'crypto';
import { logger } from '../config/logger';

export interface StorageConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucketName: string;
}

export class StorageService {
  public client: Client;
  private bucketName: string;
  private config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = config;
    this.bucketName = config.bucketName;
    this.client = new Client({
      endPoint: config.endPoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });
  }

  async initialize(): Promise<void> {
    try {
      // Check if bucket exists, create if not
      const bucketExists = await this.client.bucketExists(this.bucketName);
      if (!bucketExists) {
        await this.client.makeBucket(this.bucketName, 'us-east-1');
        logger.info(`Created bucket: ${this.bucketName}`);
      }
      logger.info(`Storage service initialized with bucket: ${this.bucketName}`);
    } catch (error) {
      logger.error('Failed to initialize storage service:', error);
      throw error;
    }
  }

  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    contentType: string = 'application/pdf',
    metadata?: Record<string, string>
  ): Promise<{ url: string; hash: string }> {
    try {
      // Generate file hash
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      
      // Generate unique file path
      const timestamp = Date.now();
      const randomId = crypto.randomBytes(8).toString('hex');
      const filePath = `documents/${timestamp}-${randomId}-${fileName}`;

      // Upload file
      await this.client.putObject(
        this.bucketName,
        filePath,
        fileBuffer,
        fileBuffer.length,
        {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${fileName}"`,
          ...metadata
        }
      );

      const url = `${this.config.endPoint}:${this.config.port}/${this.bucketName}/${filePath}`;
      
      logger.info(`File uploaded successfully: ${filePath}`);
      return { url, hash };
    } catch (error) {
      logger.error('Failed to upload file:', error);
      throw error;
    }
  }

  async generateSignedUrl(
    objectName: string,
    expiresInSeconds: number = 3600 // 1 hour default
  ): Promise<string> {
    try {
      const signedUrl = await this.client.presignedGetObject(
        this.bucketName,
        objectName,
        expiresInSeconds
      );
      
      logger.info(`Generated signed URL for: ${objectName}`);
      return signedUrl;
    } catch (error) {
      logger.error('Failed to generate signed URL:', error);
      throw error;
    }
  }

  async deleteFile(objectName: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucketName, objectName);
      logger.info(`File deleted successfully: ${objectName}`);
    } catch (error) {
      logger.error('Failed to delete file:', error);
      throw error;
    }
  }

  async getFileInfo(objectName: string): Promise<any> {
    try {
      const stat = await this.client.statObject(this.bucketName, objectName);
      return stat;
    } catch (error) {
      logger.error('Failed to get file info:', error);
      throw error;
    }
  }

  // Extract object name from full URL
  extractObjectName(url: string): string {
    const urlParts = url.split('/');
    return urlParts.slice(4).join('/'); // Remove protocol, domain, port, bucket
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
    const data = `${documentId}:${Date.now() + (expiresIn * 1000)}`;
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
}

// Create storage service instance
const storageConfig: StorageConfig = {
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  bucketName: process.env.MINIO_BUCKET_NAME || 'mda-housing-documents'
};

export const storageService = new StorageService(storageConfig);
