"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateParams = exports.validateQuery = exports.validate = void 0;
const zod_1 = require("zod");
const errorHandler_1 = require("./errorHandler");
const validate = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const apiError = (0, errorHandler_1.handleZodError)(error);
                return res.status(apiError.statusCode).json({
                    error: apiError.message,
                    code: apiError.code,
                    details: apiError.details
                });
            }
            next(error);
        }
    };
};
exports.validate = validate;
const validateQuery = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse(req.query);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const apiError = (0, errorHandler_1.handleZodError)(error);
                return res.status(apiError.statusCode).json({
                    error: apiError.message,
                    code: apiError.code,
                    details: apiError.details
                });
            }
            next(error);
        }
    };
};
exports.validateQuery = validateQuery;
const validateParams = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse(req.params);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const apiError = (0, errorHandler_1.handleZodError)(error);
                return res.status(apiError.statusCode).json({
                    error: apiError.message,
                    code: apiError.code,
                    details: apiError.details
                });
            }
            next(error);
        }
    };
};
exports.validateParams = validateParams;
