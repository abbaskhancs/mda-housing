"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFields = exports.uploadMultiple = exports.uploadSingle = void 0;
const multer_1 = __importDefault(require("multer"));
const errorHandler_1 = require("./errorHandler");
const logger_1 = require("../config/logger");
// Configure multer for memory storage
const storage = multer_1.default.memoryStorage();
// File filter function
const fileFilter = (req, file, cb) => {
    // Allowed document types
    const allowedDocTypes = [
        'AllotmentLetter',
        'PrevTransferDeed',
        'AttorneyDeed',
        'GiftDeed',
        'CNIC_Seller',
        'CNIC_Buyer',
        'CNIC_Attorney',
        'UtilityBill_Latest',
        'NOC_BuiltStructure',
        'Photo_Seller',
        'Photo_Buyer',
        'PrevChallan',
        'NOC_Water'
    ];
    // Check if docType is provided in the request body
    const docType = req.body.docType;
    if (!docType || !allowedDocTypes.includes(docType)) {
        return cb((0, errorHandler_1.createError)('Invalid or missing document type', 400, 'INVALID_DOC_TYPE'));
    }
    // Allowed file types
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
        return cb((0, errorHandler_1.createError)('Invalid file type. Only PDF, images, and Word documents are allowed', 400, 'INVALID_FILE_TYPE'));
    }
    cb(null, true);
};
// Multer configuration
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 20 // Maximum 20 files per request
    }
});
// Middleware for single file upload
const uploadSingle = (fieldName) => {
    return (req, res, next) => {
        upload.single(fieldName)(req, res, (err) => {
            if (err) {
                logger_1.logger.error('File upload error:', err);
                if (err instanceof multer_1.default.MulterError) {
                    if (err.code === 'LIMIT_FILE_SIZE') {
                        return next((0, errorHandler_1.createError)('File too large. Maximum size is 10MB', 400, 'FILE_TOO_LARGE'));
                    }
                    if (err.code === 'LIMIT_FILE_COUNT') {
                        return next((0, errorHandler_1.createError)('Too many files. Maximum is 20 files', 400, 'TOO_MANY_FILES'));
                    }
                }
                return next(err);
            }
            next();
        });
    };
};
exports.uploadSingle = uploadSingle;
// Middleware for multiple file uploads
const uploadMultiple = (fieldName, maxCount = 20) => {
    return (req, res, next) => {
        upload.array(fieldName, maxCount)(req, res, (err) => {
            if (err) {
                logger_1.logger.error('File upload error:', err);
                if (err instanceof multer_1.default.MulterError) {
                    if (err.code === 'LIMIT_FILE_SIZE') {
                        return next((0, errorHandler_1.createError)('File too large. Maximum size is 10MB', 400, 'FILE_TOO_LARGE'));
                    }
                    if (err.code === 'LIMIT_FILE_COUNT') {
                        return next((0, errorHandler_1.createError)('Too many files. Maximum is 20 files', 400, 'TOO_MANY_FILES'));
                    }
                }
                return next(err);
            }
            next();
        });
    };
};
exports.uploadMultiple = uploadMultiple;
// Middleware for multiple fields with different file types
const uploadFields = (fields) => {
    return (req, res, next) => {
        upload.fields(fields)(req, res, (err) => {
            if (err) {
                logger_1.logger.error('File upload error:', err);
                if (err instanceof multer_1.default.MulterError) {
                    if (err.code === 'LIMIT_FILE_SIZE') {
                        return next((0, errorHandler_1.createError)('File too large. Maximum size is 10MB', 400, 'FILE_TOO_LARGE'));
                    }
                    if (err.code === 'LIMIT_FILE_COUNT') {
                        return next((0, errorHandler_1.createError)('Too many files. Maximum is 20 files', 400, 'TOO_MANY_FILES'));
                    }
                }
                return next(err);
            }
            next();
        });
    };
};
exports.uploadFields = uploadFields;
exports.default = upload;
