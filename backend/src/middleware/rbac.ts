import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

// Define user roles as constants
export const ROLES = {
  OWO: 'OWO',
  BCA: 'BCA',
  HOUSING: 'HOUSING',
  ACCOUNTS: 'ACCOUNTS',
  WATER: 'WATER',
  APPROVER: 'APPROVER',
  ADMIN: 'ADMIN'
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

// Role hierarchy for permission checking
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [ROLES.ADMIN]: 7,
  [ROLES.APPROVER]: 6,
  [ROLES.ACCOUNTS]: 5,
  [ROLES.HOUSING]: 4,
  [ROLES.BCA]: 3,
  [ROLES.OWO]: 2,
  [ROLES.WATER]: 1
};

/**
 * Check if user has required role or higher
 */
export const hasRole = (userRole: string, requiredRole: UserRole): boolean => {
  const userLevel = ROLE_HIERARCHY[userRole as UserRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole];
  return userLevel >= requiredLevel;
};

/**
 * Check if user has any of the specified roles
 */
export const hasAnyRole = (userRole: string, allowedRoles: UserRole[]): boolean => {
  return allowedRoles.some(role => userRole === role);
};

/**
 * Role-based access control middleware
 * Requires authentication middleware to be run first
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    if (!hasAnyRole(req.user.role, allowedRoles)) {
      logger.warn(`Access denied for user ${req.user.username} with role ${req.user.role}. Required roles: ${allowedRoles.join(', ')}`);
      res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: req.user.role
      });
      return;
    }

    next();
  };
};

/**
 * Require minimum role level (hierarchical)
 */
export const requireMinRole = (minRole: UserRole) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    if (!hasRole(req.user.role, minRole)) {
      logger.warn(`Access denied for user ${req.user.username} with role ${req.user.role}. Minimum required: ${minRole}`);
      res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        minimumRequired: minRole,
        current: req.user.role
      });
      return;
    }

    next();
  };
};

/**
 * Admin only access
 */
export const requireAdmin = requireRole(ROLES.ADMIN);

/**
 * Approver or Admin access
 */
export const requireApprover = requireRole(ROLES.APPROVER, ROLES.ADMIN);

/**
 * Section-specific access (BCA, HOUSING, ACCOUNTS, WATER)
 */
export const requireSectionAccess = requireRole(ROLES.BCA, ROLES.HOUSING, ROLES.ACCOUNTS, ROLES.WATER, ROLES.ADMIN);

/**
 * OWO or higher access
 */
export const requireOWOAccess = requireMinRole(ROLES.OWO);

/**
 * Check if user can access specific application stage
 */
export const canAccessStage = (userRole: string, stageCode: string): boolean => {
  // Define stage access rules
  const stageAccess: Record<string, UserRole[]> = {
    'SUBMITTED': [ROLES.OWO, ROLES.ADMIN],
    'UNDER_SCRUTINY': [ROLES.OWO, ROLES.ADMIN],
    'BCA_CLEAR': [ROLES.BCA, ROLES.ADMIN],
    'ON_HOLD_BCA': [ROLES.BCA, ROLES.ADMIN],
    'BCA_HOUSING_CLEAR': [ROLES.HOUSING, ROLES.ADMIN],
    'ON_HOLD_HOUSING': [ROLES.HOUSING, ROLES.ADMIN],
    'ACCOUNTS_CLEAR': [ROLES.ACCOUNTS, ROLES.ADMIN],
    'ON_HOLD_ACCOUNTS': [ROLES.ACCOUNTS, ROLES.ADMIN],
    'READY_FOR_APPROVAL': [ROLES.APPROVER, ROLES.ADMIN],
    'APPROVED': [ROLES.APPROVER, ROLES.ADMIN],
    'REJECTED': [ROLES.ADMIN],
    'COMPLETED': [ROLES.ADMIN]
  };

  const allowedRoles = stageAccess[stageCode] || [ROLES.ADMIN];
  return hasAnyRole(userRole, allowedRoles);
};

/**
 * Middleware to check stage access
 */
export const requireStageAccess = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
    return;
  }

  const stageCode = req.params.stageCode || req.body.stageCode || req.query.stageCode;
  if (!stageCode) {
    res.status(400).json({ 
      error: 'Stage code required',
      code: 'STAGE_CODE_REQUIRED'
    });
    return;
  }

  if (!canAccessStage(req.user.role, stageCode)) {
    logger.warn(`Stage access denied for user ${req.user.username} with role ${req.user.role} to stage ${stageCode}`);
    res.status(403).json({ 
      error: 'Access denied to this stage',
      code: 'STAGE_ACCESS_DENIED',
      stage: stageCode,
      current: req.user.role
    });
    return;
  }

  next();
};
