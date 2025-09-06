"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const logger_1 = require("../config/logger");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../schemas/validation");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Validation schemas are now imported from schemas/validation.ts
/**
 * Generate JWT token
 */
const generateToken = (payload) => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_SECRET not configured');
    }
    return jsonwebtoken_1.default.sign(payload, jwtSecret, {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });
};
/**
 * POST /api/auth/login
 * User login
 */
router.post('/login', (0, validation_1.validate)(validation_2.authSchemas.login), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { username, password } = req.body;
    // Find user by username or email
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { username },
                { email: username }
            ]
        }
    });
    if (!user) {
        logger_1.logger.warn(`Login attempt with invalid username: ${username}`);
        throw (0, errorHandler_1.createError)('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }
    if (!user.isActive) {
        logger_1.logger.warn(`Login attempt with inactive user: ${username}`);
        throw (0, errorHandler_1.createError)('Account is deactivated', 401, 'ACCOUNT_INACTIVE');
    }
    // Verify password
    const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
    if (!isValidPassword) {
        logger_1.logger.warn(`Login attempt with invalid password for user: ${username}`);
        throw (0, errorHandler_1.createError)('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }
    // Update last login
    await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
    });
    // Generate JWT token
    const token = generateToken({
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role
    });
    logger_1.logger.info(`User ${username} logged in successfully`);
    res.json({
        message: 'Login successful',
        token,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            lastLogin: user.lastLogin
        }
    });
}));
/**
 * POST /api/auth/register
 * User registration (Admin only)
 */
router.post('/register', auth_1.authenticateToken, (0, validation_1.validate)(validation_2.authSchemas.register), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // Check if user is admin
    if (req.user?.role !== rbac_1.ROLES.ADMIN) {
        throw (0, errorHandler_1.createError)('Admin access required', 403, 'ADMIN_REQUIRED');
    }
    const { username, email, password, role } = req.body;
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { username },
                { email }
            ]
        }
    });
    if (existingUser) {
        throw (0, errorHandler_1.createError)('User already exists', 409, 'USER_EXISTS', { field: existingUser.username === username ? 'username' : 'email' });
    }
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcryptjs_1.default.hash(password, saltRounds);
    // Create user
    const user = await prisma.user.create({
        data: {
            username,
            email,
            password: hashedPassword,
            role
        },
        select: {
            id: true,
            username: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true
        }
    });
    logger_1.logger.info(`New user registered: ${username} with role ${role} by ${req.user.username}`);
    res.status(201).json({
        message: 'User registered successfully',
        user
    });
}));
/**
 * GET /api/auth/profile
 * Get current user profile
 */
router.get('/profile', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
            id: true,
            username: true,
            email: true,
            role: true,
            isActive: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true
        }
    });
    if (!user) {
        throw (0, errorHandler_1.createError)('User not found', 404, 'USER_NOT_FOUND');
    }
    res.json({
        user
    });
}));
/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', auth_1.authenticateToken, (0, validation_1.validate)(validation_2.authSchemas.updateProfile), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email } = req.body;
    const user = await prisma.user.update({
        where: { id: req.user.id },
        data: {
            ...(email && { email })
        },
        select: {
            id: true,
            username: true,
            email: true,
            role: true,
            isActive: true,
            lastLogin: true,
            updatedAt: true
        }
    });
    logger_1.logger.info(`User ${req.user.username} updated profile`);
    res.json({
        message: 'Profile updated successfully',
        user
    });
}));
/**
 * PUT /api/auth/change-password
 * Change user password
 */
router.put('/change-password', auth_1.authenticateToken, (0, validation_1.validate)(validation_2.authSchemas.changePassword), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    // Get user with password
    const user = await prisma.user.findUnique({
        where: { id: req.user.id }
    });
    if (!user) {
        throw (0, errorHandler_1.createError)('User not found', 404, 'USER_NOT_FOUND');
    }
    // Verify current password
    const isValidPassword = await bcryptjs_1.default.compare(currentPassword, user.password);
    if (!isValidPassword) {
        throw (0, errorHandler_1.createError)('Current password is incorrect', 401, 'INVALID_CURRENT_PASSWORD');
    }
    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcryptjs_1.default.hash(newPassword, saltRounds);
    // Update password
    await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
    });
    logger_1.logger.info(`User ${req.user.username} changed password`);
    res.json({
        message: 'Password changed successfully'
    });
}));
/**
 * POST /api/auth/logout
 * User logout (client-side token removal)
 */
router.post('/logout', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.logger.info(`User ${req.user.username} logged out`);
    res.json({
        message: 'Logout successful'
    });
}));
/**
 * GET /api/auth/verify
 * Verify token validity
 */
router.get('/verify', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    res.json({
        valid: true,
        user: {
            id: req.user.id,
            username: req.user.username,
            email: req.user.email,
            role: req.user.role
        }
    });
}));
exports.default = router;
