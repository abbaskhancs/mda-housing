"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireStageAccess = exports.canAccessStage = exports.requireOWOAccess = exports.requireSectionAccess = exports.requireApprover = exports.requireAdmin = exports.requireMinRole = exports.requireRole = exports.hasAnyRole = exports.hasRole = exports.ROLES = void 0;
const logger_1 = require("../config/logger");
// Define user roles as constants
exports.ROLES = {
    OWO: 'OWO',
    BCA: 'BCA',
    HOUSING: 'HOUSING',
    ACCOUNTS: 'ACCOUNTS',
    WATER: 'WATER',
    APPROVER: 'APPROVER',
    ADMIN: 'ADMIN'
};
// Role hierarchy for permission checking
const ROLE_HIERARCHY = {
    [exports.ROLES.ADMIN]: 7,
    [exports.ROLES.APPROVER]: 6,
    [exports.ROLES.ACCOUNTS]: 5,
    [exports.ROLES.HOUSING]: 4,
    [exports.ROLES.BCA]: 3,
    [exports.ROLES.OWO]: 2,
    [exports.ROLES.WATER]: 1
};
/**
 * Check if user has required role or higher
 */
const hasRole = (userRole, requiredRole) => {
    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole];
    return userLevel >= requiredLevel;
};
exports.hasRole = hasRole;
/**
 * Check if user has any of the specified roles
 */
const hasAnyRole = (userRole, allowedRoles) => {
    return allowedRoles.some(role => userRole === role);
};
exports.hasAnyRole = hasAnyRole;
/**
 * Role-based access control middleware
 * Requires authentication middleware to be run first
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
            return;
        }
        if (!(0, exports.hasAnyRole)(req.user.role, allowedRoles)) {
            logger_1.logger.warn(`Access denied for user ${req.user.username} with role ${req.user.role}. Required roles: ${allowedRoles.join(', ')}`);
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
exports.requireRole = requireRole;
/**
 * Require minimum role level (hierarchical)
 */
const requireMinRole = (minRole) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
            return;
        }
        if (!(0, exports.hasRole)(req.user.role, minRole)) {
            logger_1.logger.warn(`Access denied for user ${req.user.username} with role ${req.user.role}. Minimum required: ${minRole}`);
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
exports.requireMinRole = requireMinRole;
/**
 * Admin only access
 */
exports.requireAdmin = (0, exports.requireRole)(exports.ROLES.ADMIN);
/**
 * Approver or Admin access
 */
exports.requireApprover = (0, exports.requireRole)(exports.ROLES.APPROVER, exports.ROLES.ADMIN);
/**
 * Section-specific access (BCA, HOUSING, ACCOUNTS, WATER)
 */
exports.requireSectionAccess = (0, exports.requireRole)(exports.ROLES.BCA, exports.ROLES.HOUSING, exports.ROLES.ACCOUNTS, exports.ROLES.WATER, exports.ROLES.ADMIN);
/**
 * OWO or higher access
 */
exports.requireOWOAccess = (0, exports.requireMinRole)(exports.ROLES.OWO);
/**
 * Check if user can access specific application stage
 */
const canAccessStage = (userRole, stageCode) => {
    // Define stage access rules
    const stageAccess = {
        'SUBMITTED': [exports.ROLES.OWO, exports.ROLES.ADMIN],
        'UNDER_SCRUTINY': [exports.ROLES.OWO, exports.ROLES.ADMIN],
        'BCA_CLEAR': [exports.ROLES.BCA, exports.ROLES.ADMIN],
        'ON_HOLD_BCA': [exports.ROLES.BCA, exports.ROLES.ADMIN],
        'BCA_HOUSING_CLEAR': [exports.ROLES.HOUSING, exports.ROLES.ADMIN],
        'ON_HOLD_HOUSING': [exports.ROLES.HOUSING, exports.ROLES.ADMIN],
        'ACCOUNTS_CLEAR': [exports.ROLES.ACCOUNTS, exports.ROLES.ADMIN],
        'ON_HOLD_ACCOUNTS': [exports.ROLES.ACCOUNTS, exports.ROLES.ADMIN],
        'READY_FOR_APPROVAL': [exports.ROLES.APPROVER, exports.ROLES.ADMIN],
        'APPROVED': [exports.ROLES.APPROVER, exports.ROLES.ADMIN],
        'REJECTED': [exports.ROLES.ADMIN],
        'COMPLETED': [exports.ROLES.ADMIN]
    };
    const allowedRoles = stageAccess[stageCode] || [exports.ROLES.ADMIN];
    return (0, exports.hasAnyRole)(userRole, allowedRoles);
};
exports.canAccessStage = canAccessStage;
/**
 * Middleware to check stage access
 */
const requireStageAccess = (req, res, next) => {
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
    if (!(0, exports.canAccessStage)(req.user.role, stageCode)) {
        logger_1.logger.warn(`Stage access denied for user ${req.user.username} with role ${req.user.role} to stage ${stageCode}`);
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
exports.requireStageAccess = requireStageAccess;
