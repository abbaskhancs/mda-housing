import multer from 'multer';
import { Request } from 'express';
import { createError } from './errorHandler';
import { logger } from '../config/logger';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allowed file types - we'll validate docType in the route handler instead
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(createError('Invalid file type. Only PDF, images, and Word documents are allowed', 400, 'INVALID_FILE_TYPE'));
  }

  cb(null, true);
};

// Multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 20 // Maximum 20 files per request
  }
});

// Middleware for single file upload
export const uploadSingle = (fieldName: string) => {
  return (req: Request, res: any, next: any) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        logger.error('File upload error:', err);
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(createError('File too large. Maximum size is 10MB', 400, 'FILE_TOO_LARGE'));
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return next(createError('Too many files. Maximum is 20 files', 400, 'TOO_MANY_FILES'));
          }
        }
        return next(err);
      }
      next();
    });
  };
};

// Middleware for multiple file uploads
export const uploadMultiple = (fieldName: string, maxCount: number = 20) => {
  return (req: Request, res: any, next: any) => {
    upload.array(fieldName, maxCount)(req, res, (err) => {
      if (err) {
        logger.error('File upload error:', err);
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(createError('File too large. Maximum size is 10MB', 400, 'FILE_TOO_LARGE'));
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return next(createError('Too many files. Maximum is 20 files', 400, 'TOO_MANY_FILES'));
          }
        }
        return next(err);
      }
      next();
    });
  };
};

// Middleware for multiple fields with different file types
export const uploadFields = (fields: multer.Field[]) => {
  return (req: Request, res: any, next: any) => {
    upload.fields(fields)(req, res, (err) => {
      if (err) {
        logger.error('File upload error:', err);
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(createError('File too large. Maximum size is 10MB', 400, 'FILE_TOO_LARGE'));
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return next(createError('Too many files. Maximum is 20 files', 400, 'TOO_MANY_FILES'));
          }
        }
        return next(err);
      }
      next();
    });
  };
};

export default upload;
