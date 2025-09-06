import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, JWTPayload } from '../middleware/auth';
import { ROLES } from '../middleware/rbac';
import { logger } from '../config/logger';
import { validate } from '../middleware/validation';
import { authSchemas } from '../schemas/validation';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas are now imported from schemas/validation.ts

/**
 * Generate JWT token
 */
const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(payload, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  } as jwt.SignOptions);
};

/**
 * POST /api/auth/login
 * User login
 */
router.post('/login', validate(authSchemas.login), asyncHandler(async (req: Request, res: Response) => {
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
    logger.warn(`Login attempt with invalid username: ${username}`);
    throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    logger.warn(`Login attempt with inactive user: ${username}`);
    throw createError('Account is deactivated', 401, 'ACCOUNT_INACTIVE');
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    logger.warn(`Login attempt with invalid password for user: ${username}`);
    throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
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

  logger.info(`User ${username} logged in successfully`);

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
router.post('/register', authenticateToken, validate(authSchemas.register), asyncHandler(async (req: Request, res: Response) => {
  // Check if user is admin
  if (req.user?.role !== ROLES.ADMIN) {
    throw createError('Admin access required', 403, 'ADMIN_REQUIRED');
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
    throw createError(
      'User already exists',
      409,
      'USER_EXISTS',
      { field: existingUser.username === username ? 'username' : 'email' }
    );
  }

  // Hash password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

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

  logger.info(`New user registered: ${username} with role ${role} by ${req.user.username}`);

  res.status(201).json({
    message: 'User registered successfully',
    user
  });
}));

/**
 * GET /api/auth/profile
 * Get current user profile
 */
router.get('/profile', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
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
    throw createError('User not found', 404, 'USER_NOT_FOUND');
  }

  res.json({
    user
  });
}));

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', authenticateToken, validate(authSchemas.updateProfile), asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user!.id },
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

  logger.info(`User ${req.user!.username} updated profile`);

  res.json({
    message: 'Profile updated successfully',
    user
  });
}));

/**
 * PUT /api/auth/change-password
 * Change user password
 */
router.put('/change-password', authenticateToken, validate(authSchemas.changePassword), asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id }
  });

  if (!user) {
    throw createError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, user.password);
  if (!isValidPassword) {
    throw createError('Current password is incorrect', 401, 'INVALID_CURRENT_PASSWORD');
  }

  // Hash new password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  // Update password
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword }
  });

  logger.info(`User ${req.user!.username} changed password`);

  res.json({
    message: 'Password changed successfully'
  });
}));

/**
 * POST /api/auth/logout
 * User logout (client-side token removal)
 */
router.post('/logout', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  logger.info(`User ${req.user!.username} logged out`);
  
  res.json({
    message: 'Logout successful'
  });
}));

/**
 * GET /api/auth/verify
 * Verify token validity
 */
router.get('/verify', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  res.json({
    valid: true,
    user: {
      id: req.user!.id,
      username: req.user!.username,
      email: req.user!.email,
      role: req.user!.role
    }
  });
}));

export default router;
