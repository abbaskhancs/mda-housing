"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.errorHandler = exports.handleJWTError = exports.handlePrismaError = exports.handleZodError = exports.createError = exports.AppError = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const logger_1 = require("../config/logger");
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const createError = (message, statusCode = 500, code = 'INTERNAL_ERROR', details) => {
    return new AppError(message, statusCode, code, details);
};
exports.createError = createError;
const handleZodError = (error) => {
    const details = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
    }));
    return (0, exports.createError)('Validation failed', 400, 'VALIDATION_ERROR', details);
};
exports.handleZodError = handleZodError;
const handlePrismaError = (error) => {
    switch (error.code) {
        case 'P2002':
            const field = error.meta?.target;
            return (0, exports.createError)(`Duplicate entry for ${field ? field.join(', ') : 'field'}`, 409, 'DUPLICATE_ENTRY', { field: field?.[0] });
        case 'P2025':
            return (0, exports.createError)('Record not found', 404, 'RECORD_NOT_FOUND');
        case 'P2003':
            return (0, exports.createError)('Foreign key constraint failed', 400, 'FOREIGN_KEY_CONSTRAINT');
        case 'P2014':
            return (0, exports.createError)('Invalid relation operation', 400, 'INVALID_RELATION');
        default:
            return (0, exports.createError)('Database operation failed', 500, 'DATABASE_ERROR', { code: error.code });
    }
};
exports.handlePrismaError = handlePrismaError;
const handleJWTError = (error) => {
    if (error.name === 'JsonWebTokenError') {
        return (0, exports.createError)('Invalid token', 401, 'INVALID_TOKEN');
    }
    if (error.name === 'TokenExpiredError') {
        return (0, exports.createError)('Token expired', 401, 'TOKEN_EXPIRED');
    }
    return (0, exports.createError)('Authentication failed', 401, 'AUTH_ERROR');
};
exports.handleJWTError = handleJWTError;
const errorHandler = (error, req, res, next) => {
    let apiError;
    // Log the error
    logger_1.logger.error('Error occurred:', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    // Handle different types of errors
    if (error instanceof zod_1.ZodError) {
        apiError = (0, exports.handleZodError)(error);
    }
    else if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        apiError = (0, exports.handlePrismaError)(error);
    }
    else if (error instanceof client_1.Prisma.PrismaClientUnknownRequestError) {
        apiError = (0, exports.createError)('Database operation failed', 500, 'DATABASE_ERROR');
    }
    else if (error instanceof client_1.Prisma.PrismaClientValidationError) {
        apiError = (0, exports.createError)('Invalid data provided', 400, 'VALIDATION_ERROR');
    }
    else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        apiError = (0, exports.handleJWTError)(error);
    }
    else if (error instanceof AppError) {
        apiError = error;
    }
    else {
        // Generic error
        apiError = (0, exports.createError)(process.env.NODE_ENV === 'development' ? error.message : 'Internal server error', 500, 'INTERNAL_ERROR');
    }
    // Send error response
    res.status(apiError.statusCode || 500).json({
        error: apiError.message,
        code: apiError.code,
        ...(apiError.details && { details: apiError.details }),
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
};
exports.errorHandler = errorHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
