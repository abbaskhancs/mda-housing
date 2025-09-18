import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import { validate, validateQuery, validateParams } from '../middleware/validation';
import { workflowSchemas, commonSchemas, applicationSchemas } from '../schemas/validation';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { logger } from '../config/logger';
import { executeGuard, validateGuardContext } from '../guards/workflowGuards';
import { documentService } from '../services/documentService';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/workflow/stages
 * Get all workflow stages
 */
router.get('/stages', authenticateToken, validateQuery(workflowSchemas.getStages), asyncHandler(async (req: Request, res: Response) => {
  const { sortOrder = 'asc' } = req.query;

  const stages = await prisma.wfStage.findMany({
    orderBy: { sortOrder: sortOrder as 'asc' | 'desc' }
  });

  res.json({
    stages
  });
}));

/**
 * GET /api/workflow/sections
 * Get all workflow sections
 */
router.get('/sections', authenticateToken, validateQuery(workflowSchemas.getSections), asyncHandler(async (req: Request, res: Response) => {
  const { group } = req.query;

  let where: any = {};
  
  if (group) {
    const sectionGroup = await prisma.wfSectionGroup.findFirst({
      where: { code: group as string },
      include: {
        members: {
          include: {
            section: true
          }
        }
      }
    });

    if (!sectionGroup) {
      throw createError('Section group not found', 404, 'SECTION_GROUP_NOT_FOUND');
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
router.get('/statuses', authenticateToken, validateQuery(workflowSchemas.getStatuses), asyncHandler(async (req: Request, res: Response) => {
  const { sortOrder = 'asc' } = req.query;

  const statuses = await prisma.wfStatus.findMany({
    orderBy: { sortOrder: sortOrder as 'asc' | 'desc' }
  });

  res.json({
    statuses
  });
}));

/**
 * GET /api/workflow/guards
 * Get all available workflow guards
 */
router.get('/guards', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const { getAvailableGuards, getGuardDescription } = await import('../guards/workflowGuards');
  
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
router.get('/transitions', authenticateToken, validateQuery(workflowSchemas.getTransitions), asyncHandler(async (req: Request, res: Response) => {
  const { from, to, applicationId, dryRun } = req.query;

  let where: any = {};

  if (from) {
    const fromStage = await prisma.wfStage.findFirst({
      where: { code: from as string }
    });
    if (fromStage) {
      where.fromStageId = fromStage.id;
    }
  }

  if (to) {
    const toStage = await prisma.wfStage.findFirst({
      where: { code: to as string }
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
      where: { id: applicationId as string },
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
      throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }

    // Evaluate guards for each transition
    const transitionsWithGuards = await Promise.all(
      transitions.map(async (transition) => {
        const guardContext = {
          applicationId: application.id,
          userId: req.user!.id,
          userRole: req.user!.role,
          fromStageId: application.currentStageId,
          toStageId: transition.toStageId,
          additionalData: { dryRun: true }
        };

        let guardResult = null;
        if (validateGuardContext(guardContext)) {
          try {
            guardResult = await executeGuard(transition.guardName, guardContext);
          } catch (error) {
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
      })
    );

    res.json({
      transitions: transitionsWithGuards,
      application: {
        id: application.id,
        currentStage: application.currentStage
      }
    });
  } else {
    res.json({
      transitions
    });
  }
}));

/**
 * GET /api/workflow/transitions/:fromStage
 * Get available transitions from a specific stage with optional dry-run guard evaluation
 */
router.get('/transitions/:fromStage', authenticateToken, validateParams(z.object({ fromStage: z.string() })), validateQuery(z.object({ 
  applicationId: z.string().cuid('Invalid application ID').optional(),
  dryRun: z.enum(['true', 'false']).optional()
})), asyncHandler(async (req: Request, res: Response) => {
  const { fromStage } = req.params;
  const { applicationId, dryRun } = req.query;

  const stage = await prisma.wfStage.findFirst({
    where: { code: fromStage }
  });

  if (!stage) {
    throw createError('Stage not found', 404, 'STAGE_NOT_FOUND');
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
      where: { id: applicationId as string },
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
      throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }

    // Evaluate guards for each transition
    const transitionsWithGuards = await Promise.all(
      transitions.map(async (transition) => {
        const guardContext = {
          applicationId: application.id,
          userId: req.user!.id,
          userRole: req.user!.role,
          fromStageId: application.currentStageId,
          toStageId: transition.toStageId,
          additionalData: { dryRun: true }
        };

        let guardResult = null;
        if (validateGuardContext(guardContext)) {
          try {
            guardResult = await executeGuard(transition.guardName, guardContext);
          } catch (error) {
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
      })
    );

    res.json({
      fromStage: stage,
      transitions: transitionsWithGuards,
      application: {
        id: application.id,
        currentStage: application.currentStage
      }
    });
  } else {
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
router.post('/applications/:id/transition', authenticateToken, validateParams(commonSchemas.idParam), validate(applicationSchemas.transition), asyncHandler(async (req: Request, res: Response) => {
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
    throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  // Get target stage
  const targetStage = await prisma.wfStage.findUnique({
    where: { id: toStageId }
  });

  if (!targetStage) {
    throw createError('Target stage not found', 404, 'STAGE_NOT_FOUND');
  }

  // Check if transition is valid
  const transition = await prisma.wfTransition.findFirst({
    where: {
      fromStageId: application.currentStageId,
      toStageId: toStageId
    }
  });

  if (!transition) {
    throw createError('Invalid transition', 400, 'INVALID_TRANSITION');
  }

  // Execute guard evaluation
  const guardContext = {
    applicationId: id,
    userId: req.user!.id,
    userRole: req.user!.role,
    fromStageId: application.currentStageId,
    toStageId: toStageId,
    additionalData: { remarks }
  };

  if (!validateGuardContext(guardContext)) {
    throw createError('Invalid guard context', 400, 'INVALID_GUARD_CONTEXT');
  }

  const guardResult = await executeGuard(transition.guardName, guardContext);

  if (!guardResult.canTransition) {
    throw createError(
      `Transition not allowed: ${guardResult.reason}`,
      403,
      'TRANSITION_NOT_ALLOWED',
      { guard: transition.guardName, reason: guardResult.reason, metadata: guardResult.metadata }
    );
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

  // Auto-generate dispatch memo when transitioning to READY_FOR_APPROVAL
  if (targetStage.code === 'READY_FOR_APPROVAL') {
    try {
      await generateDispatchMemoOnTransition(id);
      logger.info(`Auto-generated dispatch memo for application ${id} on transition to READY_FOR_APPROVAL`);
    } catch (error) {
      logger.error(`Failed to auto-generate dispatch memo for application ${id}:`, error);
      // Don't fail the transition if memo generation fails
    }
  }

  // Create audit log
  await prisma.auditLog.create({
    data: {
      applicationId: application.id,
      userId: req.user!.id,
      action: 'STAGE_TRANSITION',
      fromStageId: application.currentStageId,
      toStageId: toStageId,
      details: remarks || `Transitioned from ${application.currentStage.code} to ${targetStage.code}. Guard: ${transition.guardName}`
    }
  });

  logger.info(`Application ${id} transitioned from ${application.currentStage.code} to ${targetStage.code} by user ${req.user!.username}. Guard: ${transition.guardName}`);

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
router.post('/applications/:id/guard-test', authenticateToken, validateParams(commonSchemas.idParam), validate(applicationSchemas.transition), asyncHandler(async (req: Request, res: Response) => {
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
    throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  // Get target stage
  const targetStage = await prisma.wfStage.findUnique({
    where: { id: toStageId }
  });

  if (!targetStage) {
    throw createError('Target stage not found', 404, 'STAGE_NOT_FOUND');
  }

  // Check if transition is valid
  const transition = await prisma.wfTransition.findFirst({
    where: {
      fromStageId: application.currentStageId,
      toStageId: toStageId
    }
  });

  if (!transition) {
    throw createError('Invalid transition', 400, 'INVALID_TRANSITION');
  }

  // Execute guard evaluation (dry-run)
  const guardContext = {
    applicationId: id,
    userId: req.user!.id,
    userRole: req.user!.role,
    fromStageId: application.currentStageId,
    toStageId: toStageId,
    additionalData: { dryRun: true }
  };

  if (!validateGuardContext(guardContext)) {
    throw createError('Invalid guard context', 400, 'INVALID_GUARD_CONTEXT');
  }

  const guardResult = await executeGuard(transition.guardName, guardContext);

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

/**
 * Auto-generate dispatch memo when transitioning to READY_FOR_APPROVAL
 */
async function generateDispatchMemoOnTransition(applicationId: string): Promise<void> {
  try {
    // Get application with all required data for the memo
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        seller: true,
        buyer: true,
        plot: true,
        currentStage: true,
        attachments: true,
        clearances: {
          include: {
            section: true,
            status: true
          }
        },
        reviews: {
          include: {
            section: true
          }
        },
        accountsBreakdown: true
      }
    });

    if (!application) {
      throw new Error(`Application ${applicationId} not found`);
    }

    // Prepare template data for dispatch memo
    const templateData = {
      application: {
        id: application.id,
        applicationNumber: application.applicationNumber,
        submittedAt: application.submittedAt,
        currentStage: application.currentStage?.name || 'Unknown'
      },
      seller: {
        name: application.seller.name,
        cnic: application.seller.cnic,
        phone: application.seller.phone,
        address: application.seller.address
      },
      buyer: {
        name: application.buyer.name,
        cnic: application.buyer.cnic,
        phone: application.buyer.phone,
        address: application.buyer.address
      },
      plot: {
        plotNumber: application.plot.plotNumber,
        blockNumber: application.plot.blockNumber,
        sectorNumber: application.plot.sectorNumber,
        area: application.plot.area,
        location: application.plot.location
      },
      attachments: application.attachments.map(att => ({
        docType: att.docType,
        originalSeen: att.isOriginalSeen,
        fileName: att.fileName
      })),
      clearances: application.clearances.map(clearance => ({
        sectionName: clearance.section.name,
        status: clearance.status.code,
        remarks: clearance.remarks,
        clearedAt: clearance.clearedAt
      })),
      reviews: application.reviews.map(review => ({
        sectionName: review.section.name,
        status: review.status,
        comments: review.remarks,
        createdAt: review.createdAt,
        reviewedAt: review.reviewedAt
      })),
      accountsBreakdown: application.accountsBreakdown ? {
        arrears: application.accountsBreakdown.arrears,
        surcharge: application.accountsBreakdown.surcharge,
        nonUser: application.accountsBreakdown.nonUser,
        transferFee: application.accountsBreakdown.transferFee,
        attorneyFee: application.accountsBreakdown.attorneyFee,
        water: application.accountsBreakdown.water,
        suiGas: application.accountsBreakdown.suiGas,
        additional: application.accountsBreakdown.additional,
        totalAmount: application.accountsBreakdown.totalAmount,
        paidAmount: application.accountsBreakdown.paidAmount,
        remainingAmount: application.accountsBreakdown.remainingAmount,
        paymentVerified: application.accountsBreakdown.paymentVerified
      } : null,
      memoId: `MEMO-${Date.now()}`,
      memoDate: new Date()
    };

    // Generate the dispatch memo document
    await documentService.generateDocument({
      applicationId,
      documentType: 'DISPATCH_MEMO',
      templateData,
      expiresInHours: 24 * 7 // 7 days expiry
    });

    logger.info(`Dispatch memo auto-generated for application ${applicationId}`);
  } catch (error) {
    logger.error(`Failed to generate dispatch memo for application ${applicationId}:`, error);
    throw error;
  }
}

export default router;
