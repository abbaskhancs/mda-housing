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
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Validation schemas
const loginSchema = zod_1.z.object({
    username: zod_1.z.string().min(1, 'Username is required'),
    password: zod_1.z.string().min(1, 'Password is required')
});
const registerSchema = zod_1.z.object({
    username: zod_1.z.string().min(3, 'Username must be at least 3 characters'),
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    role: zod_1.z.enum(['OWO', 'BCA', 'HOUSING', 'ACCOUNTS', 'WATER', 'APPROVER', 'ADMIN'])
});
const changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, 'Current password is required'),
    newPassword: zod_1.z.string().min(6, 'New password must be at least 6 characters')
});
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
router.post('/login', async (req, res) => {
    try {
        console.log('Login attempt with body:', req.body);
        const { username, password } = loginSchema.parse(req.body);
        // Find user by username or email
        console.log('Looking for user with username:', username);
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email: username }
                ]
            }
        });
        console.log('User found:', user ? 'Yes' : 'No');
        if (!user) {
            logger_1.logger.warn(`Login attempt with invalid username: ${username}`);
            return res.status(401).json({
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }
        if (!user.isActive) {
            logger_1.logger.warn(`Login attempt with inactive user: ${username}`);
            return res.status(401).json({
                error: 'Account is deactivated',
                code: 'ACCOUNT_INACTIVE'
            });
        }
        // Verify password
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            logger_1.logger.warn(`Login attempt with invalid password for user: ${username}`);
            return res.status(401).json({
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                code: 'VALIDATION_ERROR',
                details: error.errors
            });
        }
        logger_1.logger.error('Login error:', error);
        res.status(500).json({
            error: 'Login failed',
            code: 'LOGIN_ERROR'
        });
    }
});
/**
 * POST /api/auth/register
 * User registration (Admin only)
 */
router.post('/register', auth_1.authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user?.role !== rbac_1.ROLES.ADMIN) {
            return res.status(403).json({
                error: 'Admin access required',
                code: 'ADMIN_REQUIRED'
            });
        }
        const { username, email, password, role } = registerSchema.parse(req.body);
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
            return res.status(409).json({
                error: 'User already exists',
                code: 'USER_EXISTS',
                field: existingUser.username === username ? 'username' : 'email'
            });
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                code: 'VALIDATION_ERROR',
                details: error.errors
            });
        }
        logger_1.logger.error('Registration error:', error);
        res.status(500).json({
            error: 'Registration failed',
            code: 'REGISTRATION_ERROR'
        });
    }
});
/**
 * GET /api/auth/profile
 * Get current user profile
 */
router.get('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
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
            return res.status(404).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }
        res.json({
            user
        });
    }
    catch (error) {
        logger_1.logger.error('Profile fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch profile',
            code: 'PROFILE_ERROR'
        });
    }
});
/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        const { email } = req.body;
        if (email && !zod_1.z.string().email().safeParse(email).success) {
            return res.status(400).json({
                error: 'Invalid email format',
                code: 'INVALID_EMAIL'
            });
        }
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
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({
                error: 'Email already in use',
                code: 'EMAIL_EXISTS'
            });
        }
        logger_1.logger.error('Profile update error:', error);
        res.status(500).json({
            error: 'Failed to update profile',
            code: 'PROFILE_UPDATE_ERROR'
        });
    }
});
/**
 * PUT /api/auth/change-password
 * Change user password
 */
router.put('/change-password', auth_1.authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
        // Get user with password
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }
        // Verify current password
        const isValidPassword = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Current password is incorrect',
                code: 'INVALID_CURRENT_PASSWORD'
            });
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                code: 'VALIDATION_ERROR',
                details: error.errors
            });
        }
        logger_1.logger.error('Password change error:', error);
        res.status(500).json({
            error: 'Failed to change password',
            code: 'PASSWORD_CHANGE_ERROR'
        });
    }
});
/**
 * POST /api/auth/logout
 * User logout (client-side token removal)
 */
router.post('/logout', auth_1.authenticateToken, async (req, res) => {
    logger_1.logger.info(`User ${req.user.username} logged out`);
    res.json({
        message: 'Logout successful'
    });
});
/**
 * GET /api/auth/verify
 * Verify token validity
 */
router.get('/verify', auth_1.authenticateToken, async (req, res) => {
    res.json({
        valid: true,
        user: {
            id: req.user.id,
            username: req.user.username,
            email: req.user.email,
            role: req.user.role
        }
    });
});
exports.default = router;
