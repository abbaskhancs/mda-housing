import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate, validateParams } from '../middleware/validation';
import { applicationSchemas, commonSchemas, clearanceSchemas, accountsSchemas, reviewSchemas, transferDeedSchemas } from '../schemas/validation';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { logger } from '../config/logger';
import { executeGuard, validateGuardContext } from '../guards/workflowGuards';
import { executeWorkflowTransition } from '../services/workflowService';
import { uploadMultiple } from '../middleware/upload';
import { uploadFile } from '../config/storage';
import { generateIntakeReceipt, createReceiptRecord } from '../services/receiptService';
import { createClearance, getClearancesByApplication, getClearanceById } from '../services/clearanceService';
import { upsertAccountsBreakdown, verifyPayment, getAccountsBreakdown, generateChallan, FeeHeads } from '../services/accountsService';
import { createReview, updateReview, getReviewsByApplication, getReviewById, getReviewsBySection } from '../services/reviewService';
import { createDeedDraft, finalizeDeed, getTransferDeed, updateDeedDraft } from '../services/deedService';
import { PDFService } from '../services/pdfService';

const router = Router();
const prisma = new PrismaClient();

// Allowed document types
const allowedDocTypes = [
  'AllotmentLetter',
  'PrevTransferDeed',
  'AttorneyDeed',
  'GiftDeed',
  'CNIC_Seller',
  'CNIC_Buyer',
  'CNIC_Attorney',
  'UtilityBill_Latest',
  'NOC_BuiltStructure',
  'Photo_Seller',
  'Photo_Buyer',
  'PrevChallan',
  'NOC_Water'
];

// Helper function to validate document type
const validateDocType = (docType: string): boolean => {
  return allowedDocTypes.includes(docType);
};

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

          if (!validateDocType(docType)) {
            throw createError(`Invalid document type: ${docType}`, 400, 'INVALID_DOC_TYPE');
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

  // Auto-transition from SUBMITTED to UNDER_SCRUTINY after receipt generation
  let finalApplication = result.application;
  try {
    const underScrutinyStage = await prisma.wfStage.findFirst({
      where: { code: 'UNDER_SCRUTINY' }
    });

    if (underScrutinyStage) {
      // Check if transition exists
      const transition = await prisma.wfTransition.findFirst({
        where: {
          fromStageId: result.application.currentStageId,
          toStageId: underScrutinyStage.id
        }
      });

      if (transition) {
        // Execute guard evaluation
        const guardContext = {
          applicationId: result.application.id,
          userId: req.user!.id,
          userRole: req.user!.role,
          fromStageId: result.application.currentStageId,
          toStageId: underScrutinyStage.id,
          additionalData: { autoTransition: true }
        };

        if (validateGuardContext(guardContext)) {
          const guardResult = await executeGuard(transition.guardName, guardContext);

          if (guardResult.canTransition) {
            // Perform the transition
            finalApplication = await prisma.application.update({
              where: { id: result.application.id },
              data: {
                previousStageId: result.application.currentStageId,
                currentStageId: underScrutinyStage.id
              },
              include: {
                seller: true,
                buyer: true,
                attorney: true,
                plot: true,
                currentStage: true,
                previousStage: true
              }
            });

            // Create audit log for auto-transition
            await prisma.auditLog.create({
              data: {
                applicationId: result.application.id,
                userId: req.user!.id,
                action: 'AUTO_STAGE_TRANSITION',
                fromStageId: result.application.currentStageId,
                toStageId: underScrutinyStage.id,
                details: `Auto-transitioned from SUBMITTED to UNDER_SCRUTINY after receipt generation`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
              }
            });

            logger.info(`Auto-transitioned application ${result.application.id} to UNDER_SCRUTINY`);
          } else {
            logger.warn(`Auto-transition blocked by guard: ${guardResult.reason}`);
          }
        }
      }
    }
  } catch (error) {
    logger.error(`Error during auto-transition for application ${result.application.id}:`, error);
    // Don't fail the request if auto-transition fails
  }

  logger.info(`Application created: ${result.application.id} by user ${req.user!.username} with ${result.attachments.length} attachments`);

  res.status(201).json({
    message: 'Application created successfully',
    application: finalApplication,
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

        if (!validateDocType(docType)) {
          throw createError(`Invalid document type: ${docType}`, 400, 'INVALID_DOC_TYPE');
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

/**
 * POST /api/applications/:id/clearances
 * Create clearance for application with auto-progress logic
 */
router.post('/:id/clearances', authenticateToken, validateParams(commonSchemas.idParam), validate(clearanceSchemas.create), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { sectionId, statusId, remarks, signedPdfUrl } = req.body;

  // Check if application exists
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      currentStage: true
    }
  });

  if (!application) {
    throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  // Create clearance with auto-progress logic
  const result = await createClearance(
    id,
    sectionId,
    statusId,
    remarks || null,
    req.user!.id,
    signedPdfUrl,
    req.user!.role
  );

  // Update audit log with IP and user agent
  await prisma.auditLog.updateMany({
    where: {
      applicationId: id,
      userId: req.user!.id,
      action: 'CLEARANCE_CREATED'
    },
    data: {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  // If there was an auto-transition, update its audit log too
  if (result.autoTransition) {
    await prisma.auditLog.updateMany({
      where: {
        applicationId: id,
        userId: req.user!.id,
        action: 'AUTO_STAGE_TRANSITION'
      },
      data: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
  }

  logger.info(`Clearance created for application ${id} by user ${req.user!.username}. Auto-transition: ${result.autoTransition ? 'Yes' : 'No'}`);

  res.status(201).json({
    message: 'Clearance created successfully',
    clearance: result.clearance,
    autoTransition: result.autoTransition
  });
}));

/**
 * GET /api/applications/:id/clearances
 * Get all clearances for an application
 */
router.get('/:id/clearances', authenticateToken, validateParams(commonSchemas.idParam), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if application exists
  const application = await prisma.application.findUnique({
    where: { id }
  });

  if (!application) {
    throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  const clearances = await getClearancesByApplication(id);

  res.json({
    clearances
  });
}));

/**
 * GET /api/applications/:id/clearances/:clearanceId
 * Get specific clearance by ID
 */
router.get('/:id/clearances/:clearanceId', authenticateToken, validateParams(commonSchemas.idParam), validateParams(commonSchemas.idParam), asyncHandler(async (req: Request, res: Response) => {
  const { id, clearanceId } = req.params;

  // Check if application exists
  const application = await prisma.application.findUnique({
    where: { id }
  });

  if (!application) {
    throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  const clearance = await getClearanceById(clearanceId);

  if (!clearance) {
    throw createError('Clearance not found', 404, 'CLEARANCE_NOT_FOUND');
  }

  // Verify clearance belongs to this application
  if (clearance.applicationId !== id) {
    throw createError('Clearance does not belong to this application', 400, 'INVALID_CLEARANCE');
  }

  res.json({
    clearance
  });
}));

/**
 * POST /api/applications/:id/accounts
 * Update accounts breakdown with fee heads for application
 */
router.post('/:id/accounts', authenticateToken, validateParams(commonSchemas.idParam), validate(accountsSchemas.create), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { arrears, surcharge, nonUser, transferFee, attorneyFee, water, suiGas, additional } = req.body;

  // Check if application exists
  const application = await prisma.application.findUnique({
    where: { id }
  });

  if (!application) {
    throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  const feeHeads: FeeHeads = {
    arrears: Number(arrears) || 0,
    surcharge: Number(surcharge) || 0,
    nonUser: Number(nonUser) || 0,
    transferFee: Number(transferFee) || 0,
    attorneyFee: Number(attorneyFee) || 0,
    water: Number(water) || 0,
    suiGas: Number(suiGas) || 0,
    additional: Number(additional) || 0
  };

  // Upsert accounts breakdown
  const result = await upsertAccountsBreakdown(
    id,
    feeHeads,
    undefined, // challanNo - will be generated separately
    undefined, // challanDate - will be generated separately
    req.user!.id
  );

  // Update audit log with IP and user agent
  await prisma.auditLog.updateMany({
    where: {
      applicationId: id,
      userId: req.user!.id,
      action: 'ACCOUNTS_UPDATE'
    },
    data: {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  // If there was an auto-transition, update its audit log too
  if (result.autoTransition) {
    await prisma.auditLog.updateMany({
      where: {
        applicationId: id,
        userId: req.user!.id,
        action: 'AUTO_STAGE_TRANSITION'
      },
      data: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
  }

  logger.info(`Accounts breakdown updated for application ${id} by user ${req.user!.username}. Auto-transition: ${result.autoTransition ? 'Yes' : 'No'}`);

  res.status(201).json({
    message: 'Accounts breakdown updated successfully',
    accountsBreakdown: result.accountsBreakdown,
    autoTransition: result.autoTransition
  });
}));

/**
 * POST /api/applications/:id/accounts/verify-payment
 * Verify payment and update accounts breakdown
 */
router.post('/:id/accounts/verify-payment', authenticateToken, validateParams(commonSchemas.idParam), validate(accountsSchemas.verifyPayment), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { paidAmount, challanUrl } = req.body;

  // Check if application exists
  const application = await prisma.application.findUnique({
    where: { id }
  });

  if (!application) {
    throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  // Verify payment
  const result = await verifyPayment(
    id,
    paidAmount,
    challanUrl || null,
    req.user!.id
  );

  // Update audit log with IP and user agent
  await prisma.auditLog.updateMany({
    where: {
      applicationId: id,
      userId: req.user!.id,
      action: 'PAYMENT_VERIFIED'
    },
    data: {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  // If there was an auto-transition, update its audit log too
  if (result.autoTransition) {
    await prisma.auditLog.updateMany({
      where: {
        applicationId: id,
        userId: req.user!.id,
        action: 'AUTO_STAGE_TRANSITION'
      },
      data: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
  }

  // If ACCOUNTS clearance was created, update its audit log too
  if (result.clearanceCreated) {
    await prisma.auditLog.updateMany({
      where: {
        applicationId: id,
        userId: req.user!.id,
        action: 'CLEARANCE_CREATED'
      },
      data: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
  }

  logger.info(`Payment verified for application ${id} by user ${req.user!.username}. Auto-transition: ${result.autoTransition ? 'Yes' : 'No'}, Clearance created: ${result.clearanceCreated ? 'Yes' : 'No'}`);

  res.status(200).json({
    message: 'Payment verified successfully',
    accountsBreakdown: result.accountsBreakdown,
    autoTransition: result.autoTransition,
    clearanceCreated: result.clearanceCreated
  });
}));

/**
 * GET /api/applications/:id/accounts
 * Get accounts breakdown for application
 */
router.get('/:id/accounts', authenticateToken, validateParams(commonSchemas.idParam), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if application exists
  const application = await prisma.application.findUnique({
    where: { id }
  });

  if (!application) {
    throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  const accountsBreakdown = await getAccountsBreakdown(id);

  res.json({
    accountsBreakdown
  });
}));

/**
 * POST /api/applications/:id/accounts/generate-challan
 * Generate challan for application
 */
router.post('/:id/accounts/generate-challan', authenticateToken, validateParams(commonSchemas.idParam), validate(accountsSchemas.generateChallan), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if application exists
  const application = await prisma.application.findUnique({
    where: { id }
  });

  if (!application) {
    throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  // Generate challan
  const result = await generateChallan(id, req.user!.id);

  // Update audit log with IP and user agent
  await prisma.auditLog.updateMany({
    where: {
      applicationId: id,
      userId: req.user!.id,
      action: 'CHALLAN_GENERATED'
    },
    data: {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  logger.info(`Challan generated for application ${id} by user ${req.user!.username}: ${result.challanNo}`);

  res.status(201).json({
    message: 'Challan generated successfully',
    accountsBreakdown: result.accountsBreakdown,
    challanNo: result.challanNo,
    challanDate: result.challanDate
  });
}));

/**
 * GET /api/applications/:id/accounts/challan-pdf
 * Generate and download challan PDF
 */
router.get('/:id/accounts/challan-pdf', authenticateToken, validateParams(commonSchemas.idParam), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if application exists
  const application = await prisma.application.findUnique({
    where: { id }
  });

  if (!application) {
    throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  // Get accounts breakdown
  const accountsBreakdown = await getAccountsBreakdown(id);

  if (!accountsBreakdown) {
    throw createError('Accounts breakdown not found', 404, 'ACCOUNTS_BREAKDOWN_NOT_FOUND');
  }

  if (!accountsBreakdown.challanNo) {
    throw createError('Challan not generated yet', 400, 'CHALLAN_NOT_GENERATED');
  }

  // Generate PDF
  const pdfService = new PDFService();
  await pdfService.initialize();

  const pdfBuffer = await pdfService.generateChallan({
    application: accountsBreakdown.application,
    accountsBreakdown,
    plot: accountsBreakdown.application.plot,
    seller: accountsBreakdown.application.seller,
    buyer: accountsBreakdown.application.buyer
  });

  // Set response headers for PDF download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="challan-${accountsBreakdown.challanNo}.pdf"`);
  res.setHeader('Content-Length', pdfBuffer.length);

  logger.info(`Challan PDF generated for application ${id} by user ${req.user!.username}`);

  res.send(pdfBuffer);
}));

/**
 * POST /api/applications/:id/reviews
 * Create review for application with optional auto-transition
 */
router.post('/:id/reviews', authenticateToken, validateParams(commonSchemas.idParam), validate(reviewSchemas.create), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { sectionId, remarks, status, autoTransition = false } = req.body;

  // Check if application exists
  const application = await prisma.application.findUnique({
    where: { id }
  });

  if (!application) {
    throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  // Create review
  const result = await createReview(
    id,
    sectionId,
    req.user!.id,
    remarks || null,
    status,
    autoTransition
  );

  // Update audit log with IP and user agent
  await prisma.auditLog.updateMany({
    where: {
      applicationId: id,
      userId: req.user!.id,
      action: 'REVIEW_CREATED'
    },
    data: {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  // If there was an auto-transition, update its audit log too
  if (result.autoTransition) {
    await prisma.auditLog.updateMany({
      where: {
        applicationId: id,
        userId: req.user!.id,
        action: 'AUTO_STAGE_TRANSITION'
      },
      data: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
  }

  logger.info(`Review created for application ${id} by user ${req.user!.username}. Auto-transition: ${result.autoTransition ? 'Yes' : 'No'}`);

  res.status(201).json({
    message: 'Review created successfully',
    review: result.review,
    autoTransition: result.autoTransition
  });
}));

/**
 * PUT /api/applications/:id/reviews/:reviewId
 * Update review with optional auto-transition
 */
router.put('/:id/reviews/:reviewId', authenticateToken, validateParams(commonSchemas.idParam), validate(reviewSchemas.update), asyncHandler(async (req: Request, res: Response) => {
  const { id, reviewId } = req.params;
  const { remarks, status, autoTransition = false } = req.body;

  // Check if application exists
  const application = await prisma.application.findUnique({
    where: { id }
  });

  if (!application) {
    throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  // Update review
  const result = await updateReview(
    reviewId,
    req.user!.id,
    remarks || null,
    status,
    autoTransition
  );

  // Update audit log with IP and user agent
  await prisma.auditLog.updateMany({
    where: {
      applicationId: id,
      userId: req.user!.id,
      action: 'REVIEW_UPDATED'
    },
    data: {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  // If there was an auto-transition, update its audit log too
  if (result.autoTransition) {
    await prisma.auditLog.updateMany({
      where: {
        applicationId: id,
        userId: req.user!.id,
        action: 'AUTO_STAGE_TRANSITION'
      },
      data: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
  }

  logger.info(`Review updated for application ${id} by user ${req.user!.username}. Auto-transition: ${result.autoTransition ? 'Yes' : 'No'}`);

  res.status(200).json({
    message: 'Review updated successfully',
    review: result.review,
    autoTransition: result.autoTransition
  });
}));

/**
 * GET /api/applications/:id/reviews
 * Get all reviews for an application
 */
router.get('/:id/reviews', authenticateToken, validateParams(commonSchemas.idParam), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if application exists
  const application = await prisma.application.findUnique({
    where: { id }
  });

  if (!application) {
    throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  const reviews = await getReviewsByApplication(id);

  res.json({
    reviews
  });
}));

/**
 * GET /api/applications/:id/reviews/:reviewId
 * Get specific review by ID
 */
router.get('/:id/reviews/:reviewId', authenticateToken, validateParams(commonSchemas.idParam), asyncHandler(async (req: Request, res: Response) => {
  const { id, reviewId } = req.params;

  // Check if application exists
  const application = await prisma.application.findUnique({
    where: { id }
  });

  if (!application) {
    throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  const review = await getReviewById(reviewId);

  if (!review) {
    throw createError('Review not found', 404, 'REVIEW_NOT_FOUND');
  }

  // Verify review belongs to this application
  if (review.applicationId !== id) {
    throw createError('Review does not belong to this application', 400, 'INVALID_REVIEW');
  }

  res.json({
    review
  });
}));

/**
 * GET /api/applications/:id/reviews/section/:sectionCode
 * Get reviews by section for an application
 */
router.get('/:id/reviews/section/:sectionCode', authenticateToken, validateParams(commonSchemas.idParam), asyncHandler(async (req: Request, res: Response) => {
  const { id, sectionCode } = req.params;

  // Check if application exists
  const application = await prisma.application.findUnique({
    where: { id }
  });

  if (!application) {
    throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  const reviews = await getReviewsBySection(id, sectionCode);

  res.json({
    reviews
  });
}));

/**
 * POST /api/applications/:id/transfer-deed/draft
 * Create transfer deed draft
 */
router.post('/:id/transfer-deed/draft', authenticateToken, validateParams(commonSchemas.idParam), validate(transferDeedSchemas.create), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { witness1Id, witness2Id, deedContent } = req.body;

  // Check if application exists
  const application = await prisma.application.findUnique({
    where: { id }
  });

  if (!application) {
    throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  // Create deed draft
  const result = await createDeedDraft(
    id,
    witness1Id,
    witness2Id,
    deedContent || null,
    req.user!.id
  );

  // Update audit log with IP and user agent
  await prisma.auditLog.updateMany({
    where: {
      applicationId: id,
      userId: req.user!.id,
      action: 'DEED_DRAFTED'
    },
    data: {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  logger.info(`Transfer deed draft created for application ${id} by user ${req.user!.username}`);

  res.status(201).json({
    message: 'Transfer deed draft created successfully',
    transferDeed: result.transferDeed
  });
}));

/**
 * PUT /api/applications/:id/transfer-deed/draft
 * Update transfer deed draft
 */
router.put('/:id/transfer-deed/draft', authenticateToken, validateParams(commonSchemas.idParam), validate(transferDeedSchemas.update), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { witness1Id, witness2Id, deedContent } = req.body;

  // Check if application exists
  const application = await prisma.application.findUnique({
    where: { id }
  });

  if (!application) {
    throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  // Update deed draft
  const result = await updateDeedDraft(
    id,
    witness1Id || null,
    witness2Id || null,
    deedContent || null,
    req.user!.id
  );

  // Update audit log with IP and user agent
  await prisma.auditLog.updateMany({
    where: {
      applicationId: id,
      userId: req.user!.id,
      action: 'DEED_DRAFT_UPDATED'
    },
    data: {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  logger.info(`Transfer deed draft updated for application ${id} by user ${req.user!.username}`);

  res.status(200).json({
    message: 'Transfer deed draft updated successfully',
    transferDeed: result.transferDeed
  });
}));

/**
 * POST /api/applications/:id/transfer-deed/finalize
 * Finalize transfer deed with hash and ownership transfer
 */
router.post('/:id/transfer-deed/finalize', authenticateToken, validateParams(commonSchemas.idParam), validate(transferDeedSchemas.finalize), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { witness1Signature, witness2Signature, finalPdfUrl } = req.body;

  // Check if application exists
  const application = await prisma.application.findUnique({
    where: { id }
  });

  if (!application) {
    throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  // Finalize deed
  const result = await finalizeDeed(
    id,
    witness1Signature,
    witness2Signature,
    finalPdfUrl,
    req.user!.id
  );

  // Update audit log with IP and user agent
  await prisma.auditLog.updateMany({
    where: {
      applicationId: id,
      userId: req.user!.id,
      action: 'DEED_FINALIZED'
    },
    data: {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  // Update ownership transfer audit log
  await prisma.auditLog.updateMany({
    where: {
      applicationId: id,
      userId: req.user!.id,
      action: 'OWNERSHIP_TRANSFERRED'
    },
    data: {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  // If there was a stage transition, update its audit log too
  if (result.stageTransition) {
    await prisma.auditLog.updateMany({
      where: {
        applicationId: id,
        userId: req.user!.id,
        action: 'STAGE_TRANSITION'
      },
      data: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
  }

  // If there was an auto-transition, update its audit log too
  if (result.autoTransition) {
    await prisma.auditLog.updateMany({
      where: {
        applicationId: id,
        userId: req.user!.id,
        action: 'AUTO_STAGE_TRANSITION'
      },
      data: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
  }

  logger.info(`Transfer deed finalized for application ${id} by user ${req.user!.username}. Stage transition: ${result.stageTransition ? 'Yes' : 'No'}, Auto-transition: ${result.autoTransition ? 'Yes' : 'No'}, Ownership transferred: ${result.ownershipTransferred ? 'Yes' : 'No'}`);

  res.status(200).json({
    message: 'Transfer deed finalized successfully',
    transferDeed: result.transferDeed,
    stageTransition: result.stageTransition,
    autoTransition: result.autoTransition,
    ownershipTransferred: result.ownershipTransferred
  });
}));

/**
 * POST /api/applications/:id/transfer-deed/photos-signatures
 * Upload photos and signatures for transfer deed
 */
router.post('/:id/transfer-deed/photos-signatures', authenticateToken, requireRole('ADMIN', 'APPROVER'), validateParams(commonSchemas.idParam), uploadMultiple('files', 8), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    throw createError('No files provided', 400, 'NO_FILES');
  }

  // Use database transaction
  const result = await prisma.$transaction(async (tx) => {
    // Check if application exists and has transfer deed
    const application = await tx.application.findUnique({
      where: { id },
      include: {
        transferDeed: true
      }
    });

    if (!application) {
      throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }

    if (!application.transferDeed) {
      throw createError('Transfer deed not found', 404, 'TRANSFER_DEED_NOT_FOUND');
    }

    if (application.transferDeed.isFinalized) {
      throw createError('Transfer deed already finalized', 400, 'DEED_ALREADY_FINALIZED');
    }

    const uploadedFiles: { [key: string]: string } = {};

    // Process each file
    for (const file of files) {
      const fieldName = file.fieldname;

      // Validate field name
      const allowedFields = [
        'sellerPhoto', 'buyerPhoto', 'witness1Photo', 'witness2Photo',
        'sellerSignature', 'buyerSignature', 'witness1Signature', 'witness2Signature'
      ];

      if (!allowedFields.includes(fieldName)) {
        throw createError(`Invalid field name: ${fieldName}`, 400, 'INVALID_FIELD');
      }

      // Validate file type (images only)
      if (!file.mimetype.startsWith('image/')) {
        throw createError(`Invalid file type for ${fieldName}. Only images are allowed.`, 400, 'INVALID_FILE_TYPE');
      }

      try {
        // Upload file to storage
        const uploadResult = await uploadFile(file, application.id, `deed_${fieldName}`);
        uploadedFiles[`${fieldName}Url`] = uploadResult.url;
      } catch (error) {
        logger.error(`Error uploading file ${fieldName}:`, error);
        throw createError(`Error uploading file ${fieldName}: ${error instanceof Error ? error.message : 'Unknown error'}`, 500, 'FILE_UPLOAD_ERROR');
      }
    }

    // Update transfer deed with uploaded file URLs
    const updatedTransferDeed = await tx.transferDeed.update({
      where: { id: application.transferDeed.id },
      data: uploadedFiles,
      include: {
        witness1: true,
        witness2: true
      }
    });

    return updatedTransferDeed;
  });

  res.json({
    success: true,
    data: result
  });
}));

/**
 * GET /api/applications/:id/transfer-deed
 * Get transfer deed for application
 */
router.get('/:id/transfer-deed', authenticateToken, validateParams(commonSchemas.idParam), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if application exists
  const application = await prisma.application.findUnique({
    where: { id }
  });

  if (!application) {
    throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  const transferDeed = await getTransferDeed(id);

  res.json({
    transferDeed
  });
}));

/**
 * GET /api/applications/bca/pending
 * Get applications that need BCA clearance
 */
router.get('/bca/pending', authenticateToken, requireRole('BCA', 'ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  // Get applications that are in SENT_TO_BCA_HOUSING stage or have pending BCA clearances
  const applications = await prisma.application.findMany({
    where: {
      OR: [
        {
          currentStage: {
            code: 'SENT_TO_BCA_HOUSING'
          }
        },
        {
          currentStage: {
            code: 'BCA_PENDING'
          }
        },
        {
          clearances: {
            some: {
              section: {
                code: 'BCA'
              },
              status: {
                code: 'PENDING'
              }
            }
          }
        }
      ]
    },
    include: {
      seller: true,
      buyer: true,
      attorney: true,
      plot: true,
      currentStage: true,
      clearances: {
        where: {
          section: {
            code: 'BCA'
          }
        },
        include: {
          section: true,
          status: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  res.json({
    applications
  });
}));

/**
 * POST /api/applications/:id/bca/generate-pdf
 * Generate BCA clearance PDF
 */
router.post('/:id/bca/generate-pdf', authenticateToken, requireRole('BCA', 'ADMIN'), validateParams(commonSchemas.idParam), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if application exists
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      seller: true,
      buyer: true,
      attorney: true,
      plot: true,
      currentStage: true
    }
  });

  if (!application) {
    throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  // Generate BCA clearance PDF using document service
  const { DocumentService } = await import('../services/documentService');
  const documentService = new DocumentService();

  const result = await documentService.generateDocument({
    applicationId: application.id,
    documentType: 'BCA_CLEARANCE',
    templateData: {
      application,
      sectionName: 'BCA'
    }
  });

  logger.info(`BCA clearance PDF generated for application ${id} by user ${req.user!.username}`);

  res.json({
    message: 'BCA clearance PDF generated successfully',
    signedUrl: result.downloadUrl,
    documentId: result.id
  });
}));

/**
 * GET /api/applications/housing/pending
 * Get applications that need Housing clearance
 */
router.get('/housing/pending', authenticateToken, requireRole('HOUSING', 'ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  // Get applications that are in SENT_TO_BCA_HOUSING stage or have pending Housing clearances
  const applications = await prisma.application.findMany({
    where: {
      OR: [
        {
          currentStage: {
            code: 'SENT_TO_BCA_HOUSING'
          }
        },
        {
          currentStage: {
            code: 'HOUSING_PENDING'
          }
        },
        {
          clearances: {
            some: {
              section: {
                code: 'HOUSING'
              },
              status: {
                code: 'PENDING'
              }
            }
          }
        }
      ]
    },
    include: {
      seller: true,
      buyer: true,
      attorney: true,
      plot: true,
      currentStage: true,
      clearances: {
        where: {
          section: {
            code: 'HOUSING'
          }
        },
        include: {
          section: true,
          status: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  res.json({
    applications
  });
}));

/**
 * GET /api/applications/owo/bca-housing-review
 * Get applications that need OWO review for BCA/Housing clearances
 */
router.get('/owo/bca-housing-review', authenticateToken, requireRole('OWO', 'ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  // Get applications that are in BCA_HOUSING_CLEAR stage and ready for OWO review
  const applications = await prisma.application.findMany({
    where: {
      currentStage: {
        code: 'BCA_HOUSING_CLEAR'
      }
    },
    include: {
      seller: true,
      buyer: true,
      attorney: true,
      plot: true,
      currentStage: true,
      clearances: {
        where: {
          section: {
            code: {
              in: ['BCA', 'HOUSING']
            }
          }
        },
        include: {
          section: true,
          status: true
        }
      },
      reviews: {
        include: {
          section: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    applications
  });
}));

/**
 * POST /api/applications/:id/housing/generate-pdf
 * Generate Housing clearance PDF
 */
router.post('/:id/housing/generate-pdf', authenticateToken, requireRole('HOUSING', 'ADMIN'), validateParams(commonSchemas.idParam), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if application exists
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      seller: true,
      buyer: true,
      attorney: true,
      plot: true,
      currentStage: true
    }
  });

  if (!application) {
    throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  // Generate Housing clearance PDF using document service
  const { DocumentService } = await import('../services/documentService');
  const documentService = new DocumentService();

  const result = await documentService.generateDocument({
    applicationId: application.id,
    documentType: 'HOUSING_CLEARANCE',
    templateData: {
      application,
      sectionName: 'HOUSING'
    }
  });

  logger.info(`Housing clearance PDF generated for application ${id} by user ${req.user!.username}`);

  res.json({
    message: 'Housing clearance PDF generated successfully',
    signedUrl: result.downloadUrl,
    documentId: result.id
  });
}));

/**
 * POST /api/applications/:id/accounts/generate-pdf
 * Generate Accounts clearance PDF
 */
router.post('/:id/accounts/generate-pdf', authenticateToken, requireRole('ACCOUNTS', 'ADMIN'), validateParams(commonSchemas.idParam), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if application exists
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      seller: true,
      buyer: true,
      attorney: true,
      plot: true,
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

  // Check if accounts clearance exists and is CLEAR
  const accountsClearance = application.clearances.find(
    clearance => clearance.section.code === 'ACCOUNTS' && clearance.status.code === 'CLEAR'
  );

  if (!accountsClearance) {
    throw createError('Accounts clearance not found or not cleared', 400, 'ACCOUNTS_CLEARANCE_NOT_FOUND');
  }

  // Generate Accounts clearance PDF using document service
  const { DocumentService } = await import('../services/documentService');
  const documentService = new DocumentService();

  const result = await documentService.generateDocument({
    applicationId: application.id,
    documentType: 'ACCOUNTS_CLEARANCE',
    templateData: {
      application,
      sectionName: 'ACCOUNTS',
      clearance: accountsClearance
    }
  });

  logger.info(`Accounts clearance PDF generated for application ${id} by user ${req.user!.username}`);

  res.json({
    message: 'Accounts clearance PDF generated successfully',
    signedUrl: result.downloadUrl,
    documentId: result.id
  });
}));

/**
 * POST /api/applications/:id/accounts/set-pending-payment
 * Set accounts status to pending payment
 */
router.post('/:id/accounts/set-pending-payment', authenticateToken, validateParams(commonSchemas.idParam), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if application exists and is in ACCOUNTS_PENDING stage
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      currentStage: true,
      accountsBreakdown: true
    }
  });

  if (!application) {
    throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  if (application.currentStage.code !== 'ACCOUNTS_PENDING') {
    throw createError('Application must be in Accounts Pending stage', 400, 'INVALID_STAGE');
  }

  // Execute workflow transition
  const transitionResult = await executeWorkflowTransition(
    id,
    'AWAITING_PAYMENT',
    req.user!.id,
    req.user!.role,
    {}
  );

  if (!transitionResult.success) {
    throw createError(transitionResult.error || 'Failed to set pending payment', 400, 'TRANSITION_FAILED');
  }

  res.json({
    success: true,
    message: 'Accounts status set to pending payment',
    application: transitionResult.application,
    accountsBreakdown: transitionResult.application?.accountsBreakdown
  });
}));

/**
 * POST /api/applications/:id/accounts/raise-objection
 * Raise objection and set accounts status to on hold
 */
router.post('/:id/accounts/raise-objection', authenticateToken, validateParams(commonSchemas.idParam), validate(z.object({
  objectionReason: z.string().min(1, 'Objection reason is required').max(500, 'Objection reason too long')
})), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { objectionReason } = req.body;

  // Check if application exists and is in ACCOUNTS_PENDING stage
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      currentStage: true,
      accountsBreakdown: true
    }
  });

  if (!application) {
    throw createError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  if (application.currentStage.code !== 'ACCOUNTS_PENDING') {
    throw createError('Application must be in Accounts Pending stage', 400, 'INVALID_STAGE');
  }

  // Execute workflow transition with objection reason
  const transitionResult = await executeWorkflowTransition(
    id,
    'ON_HOLD_ACCOUNTS',
    req.user!.id,
    req.user!.role,
    { objectionReason }
  );

  if (!transitionResult.success) {
    throw createError(transitionResult.error || 'Failed to raise objection', 400, 'TRANSITION_FAILED');
  }

  res.json({
    success: true,
    message: 'Accounts objection raised successfully',
    application: transitionResult.application,
    accountsBreakdown: transitionResult.application?.accountsBreakdown
  });
}));

export default router;
