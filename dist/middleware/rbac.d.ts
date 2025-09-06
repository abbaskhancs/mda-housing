import { Request, Response, NextFunction } from 'express';
export declare const ROLES: {
    readonly OWO: "OWO";
    readonly BCA: "BCA";
    readonly HOUSING: "HOUSING";
    readonly ACCOUNTS: "ACCOUNTS";
    readonly WATER: "WATER";
    readonly APPROVER: "APPROVER";
    readonly ADMIN: "ADMIN";
};
export type UserRole = typeof ROLES[keyof typeof ROLES];
/**
 * Check if user has required role or higher
 */
export declare const hasRole: (userRole: string, requiredRole: UserRole) => boolean;
/**
 * Check if user has any of the specified roles
 */
export declare const hasAnyRole: (userRole: string, allowedRoles: UserRole[]) => boolean;
/**
 * Role-based access control middleware
 * Requires authentication middleware to be run first
 */
export declare const requireRole: (...allowedRoles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Require minimum role level (hierarchical)
 */
export declare const requireMinRole: (minRole: UserRole) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Admin only access
 */
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Approver or Admin access
 */
export declare const requireApprover: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Section-specific access (BCA, HOUSING, ACCOUNTS, WATER)
 */
export declare const requireSectionAccess: (req: Request, res: Response, next: NextFunction) => void;
/**
 * OWO or higher access
 */
export declare const requireOWOAccess: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Check if user can access specific application stage
 */
export declare const canAccessStage: (userRole: string, stageCode: string) => boolean;
/**
 * Middleware to check stage access
 */
export declare const requireStageAccess: (req: Request, res: Response, next: NextFunction) => void;
