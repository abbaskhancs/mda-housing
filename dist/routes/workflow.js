"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../schemas/validation");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../config/logger");
const workflowGuards_1 = require("../guards/workflowGuards");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
/**
 * GET /api/workflow/stages
 * Get all workflow stages
 */
router.get('/stages', auth_1.authenticateToken, (0, validation_1.validateQuery)(validation_2.workflowSchemas.getStages), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { sortOrder = 'asc' } = req.query;
    const stages = await prisma.wfStage.findMany({
        orderBy: { sortOrder: sortOrder }
    });
    res.json({
        stages
    });
}));
/**
 * GET /api/workflow/sections
 * Get all workflow sections
 */
router.get('/sections', auth_1.authenticateToken, (0, validation_1.validateQuery)(validation_2.workflowSchemas.getSections), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { group } = req.query;
    let where = {};
    if (group) {
        const sectionGroup = await prisma.wfSectionGroup.findFirst({
            where: { code: group },
            include: {
                members: {
                    include: {
                        section: true
                    }
                }
            }
        });
        if (!sectionGroup) {
            throw (0, errorHandler_1.createError)('Section group not found', 404, 'SECTION_GROUP_NOT_FOUND');
        }
        const sectionIds = sectionGroup.members.map(member => member.sectionId);
        where.id = { in: sectionIds };
    }
    const sections = await prisma.wfSection.findMany({
        where,
        orderBy: { sortOrder: 'asc' }
    });
    res.json({
        sections
    });
}));
/**
 * GET /api/workflow/statuses
 * Get all workflow statuses
 */
router.get('/statuses', auth_1.authenticateToken, (0, validation_1.validateQuery)(validation_2.workflowSchemas.getStatuses), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { sortOrder = 'asc' } = req.query;
    const statuses = await prisma.wfStatus.findMany({
        orderBy: { sortOrder: sortOrder }
    });
    res.json({
        statuses
    });
}));
/**
 * GET /api/workflow/guards
 * Get all available workflow guards
 */
router.get('/guards', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { getAvailableGuards, getGuardDescription } = await Promise.resolve().then(() => __importStar(require('../guards/workflowGuards')));
    const guards = getAvailableGuards().map(guardName => ({
        name: guardName,
        description: getGuardDescription(guardName)
    }));
    res.json({
        guards
    });
}));
/**
 * GET /api/workflow/transitions
 * Get workflow transitions with optional dry-run guard evaluation
 */
router.get('/transitions', auth_1.authenticateToken, (0, validation_1.validateQuery)(validation_2.workflowSchemas.getTransitions), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { from, to, applicationId, dryRun } = req.query;
    let where = {};
    if (from) {
        const fromStage = await prisma.wfStage.findFirst({
            where: { code: from }
        });
        if (fromStage) {
            where.fromStageId = fromStage.id;
        }
    }
    if (to) {
        const toStage = await prisma.wfStage.findFirst({
            where: { code: to }
        });
        if (toStage) {
            where.toStageId = toStage.id;
        }
    }
    const transitions = await prisma.wfTransition.findMany({
        where,
        include: {
            fromStage: true,
            toStage: true
        },
        orderBy: { sortOrder: 'asc' }
    });
    // If dry-run is requested and applicationId is provided, evaluate guards
    if (dryRun === 'true' && applicationId) {
        const application = await prisma.application.findUnique({
            where: { id: applicationId },
            include: {
                currentStage: true,
                clearances: {
                    include: {
                        section: true,
                        status: true
                    }
                }
            }
        });
        if (!application) {
            throw (0, errorHandler_1.createError)('Application not found', 404, 'APPLICATION_NOT_FOUND');
        }
        // Evaluate guards for each transition
        const transitionsWithGuards = await Promise.all(transitions.map(async (transition) => {
            const guardContext = {
                applicationId: application.id,
                userId: req.user.id,
                userRole: req.user.role,
                fromStageId: application.currentStageId,
                toStageId: transition.toStageId,
                additionalData: { dryRun: true }
            };
            let guardResult = null;
            if ((0, workflowGuards_1.validateGuardContext)(guardContext)) {
                try {
                    guardResult = await (0, workflowGuards_1.executeGuard)(transition.guardName, guardContext);
                }
                catch (error) {
                    guardResult = {
                        canTransition: false,
                        reason: `Guard evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                    };
                }
            }
            return {
                ...transition,
                guardResult
            };
        }));
        res.json({
            transitions: transitionsWithGuards,
            application: {
                id: application.id,
                currentStage: application.currentStage
            }
        });
    }
    else {
        res.json({
            transitions
        });
    }
}));
/**
 * GET /api/workflow/transitions/:fromStage
 * Get available transitions from a specific stage with optional dry-run guard evaluation
 */
router.get('/transitions/:fromStage', auth_1.authenticateToken, (0, validation_1.validateParams)(zod_1.z.object({ fromStage: zod_1.z.string() })), (0, validation_1.validateQuery)(zod_1.z.object({
    applicationId: zod_1.z.string().cuid('Invalid application ID').optional(),
    dryRun: zod_1.z.enum(['true', 'false']).optional()
})), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { fromStage } = req.params;
    const { applicationId, dryRun } = req.query;
    const stage = await prisma.wfStage.findFirst({
        where: { code: fromStage }
    });
    if (!stage) {
        throw (0, errorHandler_1.createError)('Stage not found', 404, 'STAGE_NOT_FOUND');
    }
    const transitions = await prisma.wfTransition.findMany({
        where: { fromStageId: stage.id },
        include: {
            fromStage: true,
            toStage: true
        },
        orderBy: { sortOrder: 'asc' }
    });
    // If dry-run is requested and applicationId is provided, evaluate guards
    if (dryRun === 'true' && applicationId) {
        const application = await prisma.application.findUnique({
            where: { id: applicationId },
            include: {
                currentStage: true,
                clearances: {
                    include: {
                        section: true,
                        status: true
                    }
                }
            }
        });
        if (!application) {
            throw (0, errorHandler_1.createError)('Application not found', 404, 'APPLICATION_NOT_FOUND');
        }
        // Evaluate guards for each transition
        const transitionsWithGuards = await Promise.all(transitions.map(async (transition) => {
            const guardContext = {
                applicationId: application.id,
                userId: req.user.id,
                userRole: req.user.role,
                fromStageId: application.currentStageId,
                toStageId: transition.toStageId,
                additionalData: { dryRun: true }
            };
            let guardResult = null;
            if ((0, workflowGuards_1.validateGuardContext)(guardContext)) {
                try {
                    guardResult = await (0, workflowGuards_1.executeGuard)(transition.guardName, guardContext);
                }
                catch (error) {
                    guardResult = {
                        canTransition: false,
                        reason: `Guard evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                    };
                }
            }
            return {
                ...transition,
                guardResult
            };
        }));
        res.json({
            fromStage: stage,
            transitions: transitionsWithGuards,
            application: {
                id: application.id,
                currentStage: application.currentStage
            }
        });
    }
    else {
        res.json({
            fromStage: stage,
            transitions
        });
    }
}));
/**
 * POST /api/workflow/applications/:id/transition
 * Transition application to next stage
 */
router.post('/applications/:id/transition', auth_1.authenticateToken, (0, validation_1.validateParams)(validation_2.commonSchemas.idParam), (0, validation_1.validate)(validation_2.applicationSchemas.transition), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { toStageId, remarks } = req.body;
    // Get application with current stage
    const application = await prisma.application.findUnique({
        where: { id },
        include: {
            currentStage: true,
            clearances: {
                include: {
                    section: true,
                    status: true
                }
            }
        }
    });
    if (!application) {
        throw (0, errorHandler_1.createError)('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }
    // Get target stage
    const targetStage = await prisma.wfStage.findUnique({
        where: { id: toStageId }
    });
    if (!targetStage) {
        throw (0, errorHandler_1.createError)('Target stage not found', 404, 'STAGE_NOT_FOUND');
    }
    // Check if transition is valid
    const transition = await prisma.wfTransition.findFirst({
        where: {
            fromStageId: application.currentStageId,
            toStageId: toStageId
        }
    });
    if (!transition) {
        throw (0, errorHandler_1.createError)('Invalid transition', 400, 'INVALID_TRANSITION');
    }
    // Execute guard evaluation
    const guardContext = {
        applicationId: id,
        userId: req.user.id,
        userRole: req.user.role,
        fromStageId: application.currentStageId,
        toStageId: toStageId,
        additionalData: { remarks }
    };
    if (!(0, workflowGuards_1.validateGuardContext)(guardContext)) {
        throw (0, errorHandler_1.createError)('Invalid guard context', 400, 'INVALID_GUARD_CONTEXT');
    }
    const guardResult = await (0, workflowGuards_1.executeGuard)(transition.guardName, guardContext);
    if (!guardResult.canTransition) {
        throw (0, errorHandler_1.createError)(`Transition not allowed: ${guardResult.reason}`, 403, 'TRANSITION_NOT_ALLOWED', { guard: transition.guardName, reason: guardResult.reason, metadata: guardResult.metadata });
    }
    // Update application stage
    const updatedApplication = await prisma.application.update({
        where: { id },
        data: {
            previousStageId: application.currentStageId,
            currentStageId: toStageId
        },
        include: {
            currentStage: true,
            previousStage: true
        }
    });
    // Create audit log
    await prisma.auditLog.create({
        data: {
            applicationId: application.id,
            userId: req.user.id,
            action: 'STAGE_TRANSITION',
            fromStageId: application.currentStageId,
            toStageId: toStageId,
            details: remarks || `Transitioned from ${application.currentStage.code} to ${targetStage.code}. Guard: ${transition.guardName}`
        }
    });
    logger_1.logger.info(`Application ${id} transitioned from ${application.currentStage.code} to ${targetStage.code} by user ${req.user.username}. Guard: ${transition.guardName}`);
    res.json({
        message: 'Application transitioned successfully',
        application: updatedApplication,
        transition: {
            from: application.currentStage,
            to: targetStage,
            guard: transition.guardName,
            guardResult: {
                reason: guardResult.reason,
                metadata: guardResult.metadata
            }
        }
    });
}));
/**
 * POST /api/workflow/applications/:id/guard-test
 * Test guard execution without performing transition (dry-run)
 */
router.post('/applications/:id/guard-test', auth_1.authenticateToken, (0, validation_1.validateParams)(validation_2.commonSchemas.idParam), (0, validation_1.validate)(validation_2.applicationSchemas.transition), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { toStageId } = req.body;
    // Get application with current stage
    const application = await prisma.application.findUnique({
        where: { id },
        include: {
            currentStage: true,
            clearances: {
                include: {
                    section: true,
                    status: true
                }
            }
        }
    });
    if (!application) {
        throw (0, errorHandler_1.createError)('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }
    // Get target stage
    const targetStage = await prisma.wfStage.findUnique({
        where: { id: toStageId }
    });
    if (!targetStage) {
        throw (0, errorHandler_1.createError)('Target stage not found', 404, 'STAGE_NOT_FOUND');
    }
    // Check if transition is valid
    const transition = await prisma.wfTransition.findFirst({
        where: {
            fromStageId: application.currentStageId,
            toStageId: toStageId
        }
    });
    if (!transition) {
        throw (0, errorHandler_1.createError)('Invalid transition', 400, 'INVALID_TRANSITION');
    }
    // Execute guard evaluation (dry-run)
    const guardContext = {
        applicationId: id,
        userId: req.user.id,
        userRole: req.user.role,
        fromStageId: application.currentStageId,
        toStageId: toStageId,
        additionalData: { dryRun: true }
    };
    if (!(0, workflowGuards_1.validateGuardContext)(guardContext)) {
        throw (0, errorHandler_1.createError)('Invalid guard context', 400, 'INVALID_GUARD_CONTEXT');
    }
    const guardResult = await (0, workflowGuards_1.executeGuard)(transition.guardName, guardContext);
    res.json({
        message: 'Guard test completed',
        application: {
            id: application.id,
            currentStage: application.currentStage,
            targetStage: targetStage
        },
        transition: {
            from: application.currentStage,
            to: targetStage,
            guard: transition.guardName
        },
        guardResult: {
            canTransition: guardResult.canTransition,
            reason: guardResult.reason,
            metadata: guardResult.metadata
        }
    });
}));
exports.default = router;
