import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { validate, validateParams } from '../middleware/validation';
import { applicationSchemas, commonSchemas } from '../schemas/validation';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { logger } from '../config/logger';
import { executeGuard, validateGuardContext } from '../guards/workflowGuards';
import { uploadMultiple } from '../middleware/upload';
import { uploadFile } from '../config/storage';
import { generateIntakeReceipt, createReceiptRecord } from '../services/receiptService';

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/applications
 * Create new application with attachments and receipt generation
 */
router.post('/', authenticateToken, uploadMultiple('attachments', 20), validate(applicationSchemas.create), asyncHandler(async (req: Request, res: Response) => {
  const { sellerId, buyerId, attorneyId, plotId } = req.body;
  const files = req.files as Express.Multer.File[];

  // Use database transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Verify all referenced entities exist
    const [seller, buyer, plot] = await Promise.all([
      tx.person.findUnique({ where: { id: sellerId } }),
      tx.person.findUnique({ where: { id: buyerId } }),
      tx.plot.findUnique({ where: { id: plotId } })
    ]);

    if (!seller) {
      throw createError('Seller not found', 404, 'SELLER_NOT_FOUND');
    }
    if (!buyer) {
      throw createError('Buyer not found', 404, 'BUYER_NOT_FOUND');
    }
    if (!plot) {
      throw createError('Plot not found', 404, 'PLOT_NOT_FOUND');
    }

    // Check if attorney exists if provided
    if (attorneyId) {
      const attorney = await tx.person.findUnique({ where: { id: attorneyId } });
      if (!attorney) {
        throw createError('Attorney not found', 404, 'ATTORNEY_NOT_FOUND');
      }
    }

    // Get initial stage (SUBMITTED)
    const initialStage = await tx.wfStage.findFirst({
      where: { code: 'SUBMITTED' },
      orderBy: { sortOrder: 'asc' }
    });

    if (!initialStage) {
      throw createError('Initial workflow stage not found', 500, 'WORKFLOW_ERROR');
    }

    // Create application
    const application = await tx.application.create({
      data: {
        sellerId,
        buyerId,
        attorneyId,
        plotId,
        currentStageId: initialStage.id
      },
      include: {
        seller: true,
        buyer: true,
        attorney: true,
        plot: true,
        currentStage: true
      }
    });

    // Process uploaded files
    const uploadedAttachments = [];
    if (files && files.length > 0) {
      for (const file of files) {
        try {
          // Get docType from request body (should be provided for each file)
          const docType = req.body[`docType_${file.fieldname}`] || req.body.docType;
          
          if (!docType) {
            throw createError(`Document type not specified for file: ${file.originalname}`, 400, 'MISSING_DOC_TYPE');
          }

          // Upload file to storage
          const uploadResult = await uploadFile(file, application.id, docType);

          // Create attachment record
          const attachment = await tx.attachment.create({
            data: {
              applicationId: application.id,
              docType,
              fileName: uploadResult.key,
              originalName: file.originalname,
              fileSize: file.size,
              mimeType: file.mimetype,
              storageUrl: uploadResult.url,
              hashSha256: uploadResult.hash,
              isOriginalSeen: req.body[`isOriginalSeen_${file.fieldname}`] === 'true' || false
            }
          });

          uploadedAttachments.push(attachment);
        } catch (error) {
          logger.error(`Error processing file ${file.originalname}:`, error);
          throw createError(`Error processing file ${file.originalname}: ${error instanceof Error ? error.message : 'Unknown error'}`, 500, 'FILE_PROCESSING_ERROR');
        }
      }
    }

    // Create audit log
    await tx.auditLog.create({
      data: {
        applicationId: application.id,
        userId: req.user!.id,
        action: 'APPLICATION_CREATED',
        toStageId: initialStage.id,
        details: `Application created and submitted with ${uploadedAttachments.length} attachments`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    return {
      application,
      attachments: uploadedAttachments
    };
  });

  // Generate intake receipt asynchronously
  let receiptUrl: string | null = null;
  try {
    receiptUrl = await generateIntakeReceipt(result.application.id);
    await createReceiptRecord(result.application.id, receiptUrl);
    logger.info(`Intake receipt generated for application ${result.application.id}`);
  } catch (error) {
    logger.error(`Error generating receipt for application ${result.application.id}:`, error);
    // Don't fail the request if receipt generation fails
  }

  logger.info(`Application created: ${result.application.id} by user ${req.user!.username} with ${result.attachments.length} attachments`);

  res.status(201).json({
    message: 'Application created successfully',
    application: result.application,
    attachments: result.attachments,
    receiptUrl
  });
}));

/**
 * GET /api/applications/:id
 * Get application by ID
 */
router.get('/:id', authenticateToken, validateParams(commonSchemas.idParam), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      seller: true,
      buyer: true,
      attorney: true,
      plot: true,
      currentStage: true,
      previousStage: true,
      attachments: true,
      clearances: {
        include: {
          section: true,
          status: true
        }
      },
      accountsBreakdown: true,
      reviews: {
        include: {
          section: true
        }
      },
      transferDeed: {
        include: {
          witness1: true,
          witness2: true
        }
      },
      auditLogs: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!application) {
    throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  res.json({
    application
  });
}));

/**
 * GET /api/applications
 * Get applications with pagination and filtering
 */
router.get('/', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '10', stage, status } = req.query;
  
  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};
  
  if (stage) {
    const stageRecord = await prisma.wfStage.findFirst({
      where: { code: stage as string }
    });
    if (stageRecord) {
      where.currentStageId = stageRecord.id;
    }
  }

  if (status) {
    where.status = status;
  }

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        seller: true,
        buyer: true,
        attorney: true,
        plot: true,
        currentStage: true,
        attachments: true,
        clearances: {
          include: {
            section: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.application.count({ where })
  ]);

  res.json({
    applications,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  });
}));

/**
 * PUT /api/applications/:id
 * Update application
 */
router.put('/:id', authenticateToken, validateParams(commonSchemas.idParam), validate(applicationSchemas.update), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { attorneyId } = req.body;

  // Check if application exists
  const existingApplication = await prisma.application.findUnique({
    where: { id }
  });

  if (!existingApplication) {
    throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  // Check if attorney exists if provided
  if (attorneyId) {
    const attorney = await prisma.person.findUnique({ where: { id: attorneyId } });
    if (!attorney) {
      throw createError('Attorney not found', 404, 'ATTORNEY_NOT_FOUND');
    }
  }

  const application = await prisma.application.update({
    where: { id },
    data: {
      ...(attorneyId && { attorneyId })
    },
    include: {
      seller: true,
      buyer: true,
      attorney: true,
      plot: true,
      currentStage: true
    }
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      applicationId: application.id,
      userId: req.user!.id,
      action: 'APPLICATION_UPDATED',
      details: `Application updated: ${JSON.stringify(req.body)}`
    }
  });

  logger.info(`Application updated: ${application.id} by user ${req.user!.username}`);

  res.json({
    message: 'Application updated successfully',
    application
  });
}));

/**
 * POST /api/applications/:id/transition
 * Generic transition handler for applications with transaction + AuditLog
 */
router.post('/:id/transition', authenticateToken, validateParams(commonSchemas.idParam), validate(applicationSchemas.transition), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { toStageId, remarks } = req.body;

  // Use database transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Get application with current stage and related data
    const application = await tx.application.findUnique({
      where: { id },
      include: {
        currentStage: true,
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
        accountsBreakdown: true,
        transferDeed: true
      }
    });

    if (!application) {
      throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }

    // Get target stage
    const targetStage = await tx.wfStage.findUnique({
      where: { id: toStageId }
    });

    if (!targetStage) {
      throw createError('Target stage not found', 404, 'STAGE_NOT_FOUND');
    }

    // Check if transition is valid
    const transition = await tx.wfTransition.findFirst({
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
    const updatedApplication = await tx.application.update({
      where: { id },
      data: {
        previousStageId: application.currentStageId,
        currentStageId: toStageId,
        updatedAt: new Date()
      },
      include: {
        currentStage: true,
        previousStage: true
      }
    });

    // Create audit log entry
    const auditLog = await tx.auditLog.create({
      data: {
        applicationId: application.id,
        userId: req.user!.id,
        action: 'STAGE_TRANSITION',
        fromStageId: application.currentStageId,
        toStageId: toStageId,
        details: remarks || `Transitioned from ${application.currentStage.code} to ${targetStage.code}. Guard: ${transition.guardName}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    return {
      application: updatedApplication,
      transition: {
        from: application.currentStage,
        to: targetStage,
        guard: transition.guardName,
        guardResult: {
          reason: guardResult.reason,
          metadata: guardResult.metadata
        }
      },
      auditLog
    };
  });

  logger.info(`Application ${id} transitioned from ${result.transition.from.code} to ${result.transition.to.code} by user ${req.user!.username}. Guard: ${result.transition.guard}`);

  res.json({
    message: 'Application transitioned successfully',
    application: result.application,
    transition: result.transition
  });
}));

/**
 * POST /api/applications/:id/attachments
 * Upload additional attachments to existing application
 */
router.post('/:id/attachments', authenticateToken, validateParams(commonSchemas.idParam), uploadMultiple('attachments', 20), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    throw createError('No files provided', 400, 'NO_FILES');
  }

  // Use database transaction
  const result = await prisma.$transaction(async (tx) => {
    // Check if application exists
    const application = await tx.application.findUnique({
      where: { id }
    });

    if (!application) {
      throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }

    // Process uploaded files
    const uploadedAttachments = [];
    for (const file of files) {
      try {
        // Get docType from request body
        const docType = req.body[`docType_${file.fieldname}`] || req.body.docType;
        
        if (!docType) {
          throw createError(`Document type not specified for file: ${file.originalname}`, 400, 'MISSING_DOC_TYPE');
        }

        // Upload file to storage
        const uploadResult = await uploadFile(file, application.id, docType);

        // Create attachment record
        const attachment = await tx.attachment.create({
          data: {
            applicationId: application.id,
            docType,
            fileName: uploadResult.key,
            originalName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            storageUrl: uploadResult.url,
            hashSha256: uploadResult.hash,
            isOriginalSeen: req.body[`isOriginalSeen_${file.fieldname}`] === 'true' || false
          }
        });

        uploadedAttachments.push(attachment);
      } catch (error) {
        logger.error(`Error processing file ${file.originalname}:`, error);
        throw createError(`Error processing file ${file.originalname}: ${error instanceof Error ? error.message : 'Unknown error'}`, 500, 'FILE_PROCESSING_ERROR');
      }
    }

    // Create audit log
    await tx.auditLog.create({
      data: {
        applicationId: application.id,
        userId: req.user!.id,
        action: 'ATTACHMENTS_UPLOADED',
        details: `Uploaded ${uploadedAttachments.length} additional attachments`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    return {
      application,
      attachments: uploadedAttachments
    };
  });

  logger.info(`Uploaded ${result.attachments.length} additional attachments to application ${id} by user ${req.user!.username}`);

  res.status(201).json({
    message: 'Attachments uploaded successfully',
    application: result.application,
    attachments: result.attachments
  });
}));

export default router;
