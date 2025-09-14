"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../schemas/validation");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../config/logger");
const workflowGuards_1 = require("../guards/workflowGuards");
const upload_1 = require("../middleware/upload");
const storage_1 = require("../config/storage");
const receiptService_1 = require("../services/receiptService");
const clearanceService_1 = require("../services/clearanceService");
const accountsService_1 = require("../services/accountsService");
const reviewService_1 = require("../services/reviewService");
const deedService_1 = require("../services/deedService");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
/**
 * POST /api/applications
 * Create new application with attachments and receipt generation
 */
router.post('/', auth_1.authenticateToken, (0, upload_1.uploadMultiple)('attachments', 20), (0, validation_1.validate)(validation_2.applicationSchemas.create), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { sellerId, buyerId, attorneyId, plotId } = req.body;
    const files = req.files;
    // Use database transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
        // Verify all referenced entities exist
        const [seller, buyer, plot] = await Promise.all([
            tx.person.findUnique({ where: { id: sellerId } }),
            tx.person.findUnique({ where: { id: buyerId } }),
            tx.plot.findUnique({ where: { id: plotId } })
        ]);
        if (!seller) {
            throw (0, errorHandler_1.createError)('Seller not found', 404, 'SELLER_NOT_FOUND');
        }
        if (!buyer) {
            throw (0, errorHandler_1.createError)('Buyer not found', 404, 'BUYER_NOT_FOUND');
        }
        if (!plot) {
            throw (0, errorHandler_1.createError)('Plot not found', 404, 'PLOT_NOT_FOUND');
        }
        // Check if attorney exists if provided
        if (attorneyId) {
            const attorney = await tx.person.findUnique({ where: { id: attorneyId } });
            if (!attorney) {
                throw (0, errorHandler_1.createError)('Attorney not found', 404, 'ATTORNEY_NOT_FOUND');
            }
        }
        // Get initial stage (SUBMITTED)
        const initialStage = await tx.wfStage.findFirst({
            where: { code: 'SUBMITTED' },
            orderBy: { sortOrder: 'asc' }
        });
        if (!initialStage) {
            throw (0, errorHandler_1.createError)('Initial workflow stage not found', 500, 'WORKFLOW_ERROR');
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
                        throw (0, errorHandler_1.createError)(`Document type not specified for file: ${file.originalname}`, 400, 'MISSING_DOC_TYPE');
                    }
                    // Upload file to storage
                    const uploadResult = await (0, storage_1.uploadFile)(file, application.id, docType);
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
                }
                catch (error) {
                    logger_1.logger.error(`Error processing file ${file.originalname}:`, error);
                    throw (0, errorHandler_1.createError)(`Error processing file ${file.originalname}: ${error instanceof Error ? error.message : 'Unknown error'}`, 500, 'FILE_PROCESSING_ERROR');
                }
            }
        }
        // Create audit log
        await tx.auditLog.create({
            data: {
                applicationId: application.id,
                userId: req.user.id,
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
    let receiptUrl = null;
    try {
        receiptUrl = await (0, receiptService_1.generateIntakeReceipt)(result.application.id);
        await (0, receiptService_1.createReceiptRecord)(result.application.id, receiptUrl);
        logger_1.logger.info(`Intake receipt generated for application ${result.application.id}`);
    }
    catch (error) {
        logger_1.logger.error(`Error generating receipt for application ${result.application.id}:`, error);
        // Don't fail the request if receipt generation fails
    }
    logger_1.logger.info(`Application created: ${result.application.id} by user ${req.user.username} with ${result.attachments.length} attachments`);
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
router.get('/:id', auth_1.authenticateToken, (0, validation_1.validateParams)(validation_2.commonSchemas.idParam), (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
        throw (0, errorHandler_1.createError)('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }
    res.json({
        application
    });
}));
/**
 * GET /api/applications
 * Get applications with pagination and filtering
 */
router.get('/', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { page = '1', limit = '10', stage, status } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    const where = {};
    if (stage) {
        const stageRecord = await prisma.wfStage.findFirst({
            where: { code: stage }
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
router.put('/:id', auth_1.authenticateToken, (0, validation_1.validateParams)(validation_2.commonSchemas.idParam), (0, validation_1.validate)(validation_2.applicationSchemas.update), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { attorneyId } = req.body;
    // Check if application exists
    const existingApplication = await prisma.application.findUnique({
        where: { id }
    });
    if (!existingApplication) {
        throw (0, errorHandler_1.createError)('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }
    // Check if attorney exists if provided
    if (attorneyId) {
        const attorney = await prisma.person.findUnique({ where: { id: attorneyId } });
        if (!attorney) {
            throw (0, errorHandler_1.createError)('Attorney not found', 404, 'ATTORNEY_NOT_FOUND');
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
            userId: req.user.id,
            action: 'APPLICATION_UPDATED',
            details: `Application updated: ${JSON.stringify(req.body)}`
        }
    });
    logger_1.logger.info(`Application updated: ${application.id} by user ${req.user.username}`);
    res.json({
        message: 'Application updated successfully',
        application
    });
}));
/**
 * POST /api/applications/:id/transition
 * Generic transition handler for applications with transaction + AuditLog
 */
router.post('/:id/transition', auth_1.authenticateToken, (0, validation_1.validateParams)(validation_2.commonSchemas.idParam), (0, validation_1.validate)(validation_2.applicationSchemas.transition), (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
            throw (0, errorHandler_1.createError)('Application not found', 404, 'APPLICATION_NOT_FOUND');
        }
        // Get target stage
        const targetStage = await tx.wfStage.findUnique({
            where: { id: toStageId }
        });
        if (!targetStage) {
            throw (0, errorHandler_1.createError)('Target stage not found', 404, 'STAGE_NOT_FOUND');
        }
        // Check if transition is valid
        const transition = await tx.wfTransition.findFirst({
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
                userId: req.user.id,
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
    logger_1.logger.info(`Application ${id} transitioned from ${result.transition.from.code} to ${result.transition.to.code} by user ${req.user.username}. Guard: ${result.transition.guard}`);
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
router.post('/:id/attachments', auth_1.authenticateToken, (0, validation_1.validateParams)(validation_2.commonSchemas.idParam), (0, upload_1.uploadMultiple)('attachments', 20), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const files = req.files;
    if (!files || files.length === 0) {
        throw (0, errorHandler_1.createError)('No files provided', 400, 'NO_FILES');
    }
    // Use database transaction
    const result = await prisma.$transaction(async (tx) => {
        // Check if application exists
        const application = await tx.application.findUnique({
            where: { id }
        });
        if (!application) {
            throw (0, errorHandler_1.createError)('Application not found', 404, 'APPLICATION_NOT_FOUND');
        }
        // Process uploaded files
        const uploadedAttachments = [];
        for (const file of files) {
            try {
                // Get docType from request body
                const docType = req.body[`docType_${file.fieldname}`] || req.body.docType;
                if (!docType) {
                    throw (0, errorHandler_1.createError)(`Document type not specified for file: ${file.originalname}`, 400, 'MISSING_DOC_TYPE');
                }
                // Validate docType
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
                if (!allowedDocTypes.includes(docType)) {
                    throw (0, errorHandler_1.createError)(`Invalid document type: ${docType}`, 400, 'INVALID_DOC_TYPE');
                }
                // Upload file to storage
                const uploadResult = await (0, storage_1.uploadFile)(file, application.id, docType);
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
            }
            catch (error) {
                logger_1.logger.error(`Error processing file ${file.originalname}:`, error);
                throw (0, errorHandler_1.createError)(`Error processing file ${file.originalname}: ${error instanceof Error ? error.message : 'Unknown error'}`, 500, 'FILE_PROCESSING_ERROR');
            }
        }
        // Create audit log
        await tx.auditLog.create({
            data: {
                applicationId: application.id,
                userId: req.user.id,
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
    logger_1.logger.info(`Uploaded ${result.attachments.length} additional attachments to application ${id} by user ${req.user.username}`);
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
router.post('/:id/clearances', auth_1.authenticateToken, (0, validation_1.validateParams)(validation_2.commonSchemas.idParam), (0, validation_1.validate)(validation_2.clearanceSchemas.create), (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
        throw (0, errorHandler_1.createError)('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }
    // Create clearance with auto-progress logic
    const result = await (0, clearanceService_1.createClearance)(id, sectionId, statusId, remarks || null, req.user.id, signedPdfUrl);
    // Update audit log with IP and user agent
    await prisma.auditLog.updateMany({
        where: {
            applicationId: id,
            userId: req.user.id,
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
                userId: req.user.id,
                action: 'AUTO_STAGE_TRANSITION'
            },
            data: {
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        });
    }
    logger_1.logger.info(`Clearance created for application ${id} by user ${req.user.username}. Auto-transition: ${result.autoTransition ? 'Yes' : 'No'}`);
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
router.get('/:id/clearances', auth_1.authenticateToken, (0, validation_1.validateParams)(validation_2.commonSchemas.idParam), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    // Check if application exists
    const application = await prisma.application.findUnique({
        where: { id }
    });
    if (!application) {
        throw (0, errorHandler_1.createError)('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }
    const clearances = await (0, clearanceService_1.getClearancesByApplication)(id);
    res.json({
        clearances
    });
}));
/**
 * GET /api/applications/:id/clearances/:clearanceId
 * Get specific clearance by ID
 */
router.get('/:id/clearances/:clearanceId', auth_1.authenticateToken, (0, validation_1.validateParams)(validation_2.commonSchemas.idParam), (0, validation_1.validateParams)(validation_2.commonSchemas.idParam), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id, clearanceId } = req.params;
    // Check if application exists
    const application = await prisma.application.findUnique({
        where: { id }
    });
    if (!application) {
        throw (0, errorHandler_1.createError)('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }
    const clearance = await (0, clearanceService_1.getClearanceById)(clearanceId);
    if (!clearance) {
        throw (0, errorHandler_1.createError)('Clearance not found', 404, 'CLEARANCE_NOT_FOUND');
    }
    // Verify clearance belongs to this application
    if (clearance.applicationId !== id) {
        throw (0, errorHandler_1.createError)('Clearance does not belong to this application', 400, 'INVALID_CLEARANCE');
    }
    res.json({
        clearance
    });
}));
/**
 * POST /api/applications/:id/accounts
 * Upsert accounts breakdown for application
 */
router.post('/:id/accounts', auth_1.authenticateToken, (0, validation_1.validateParams)(validation_2.commonSchemas.idParam), (0, validation_1.validate)(validation_2.accountsSchemas.create), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { totalAmount, challanUrl } = req.body;
    // Check if application exists
    const application = await prisma.application.findUnique({
        where: { id }
    });
    if (!application) {
        throw (0, errorHandler_1.createError)('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }
    // Upsert accounts breakdown
    const result = await (0, accountsService_1.upsertAccountsBreakdown)(id, totalAmount, challanUrl || null, req.user.id);
    // Update audit log with IP and user agent
    await prisma.auditLog.updateMany({
        where: {
            applicationId: id,
            userId: req.user.id,
            action: 'ACCOUNTS_UPSERTED'
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
                userId: req.user.id,
                action: 'AUTO_STAGE_TRANSITION'
            },
            data: {
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        });
    }
    logger_1.logger.info(`Accounts breakdown upserted for application ${id} by user ${req.user.username}. Auto-transition: ${result.autoTransition ? 'Yes' : 'No'}`);
    res.status(201).json({
        message: 'Accounts breakdown upserted successfully',
        accountsBreakdown: result.accountsBreakdown,
        autoTransition: result.autoTransition
    });
}));
/**
 * POST /api/applications/:id/accounts/verify-payment
 * Verify payment and update accounts breakdown
 */
router.post('/:id/accounts/verify-payment', auth_1.authenticateToken, (0, validation_1.validateParams)(validation_2.commonSchemas.idParam), (0, validation_1.validate)(validation_2.accountsSchemas.verifyPayment), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { paidAmount, challanUrl } = req.body;
    // Check if application exists
    const application = await prisma.application.findUnique({
        where: { id }
    });
    if (!application) {
        throw (0, errorHandler_1.createError)('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }
    // Verify payment
    const result = await (0, accountsService_1.verifyPayment)(id, paidAmount, challanUrl || null, req.user.id);
    // Update audit log with IP and user agent
    await prisma.auditLog.updateMany({
        where: {
            applicationId: id,
            userId: req.user.id,
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
                userId: req.user.id,
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
                userId: req.user.id,
                action: 'CLEARANCE_CREATED'
            },
            data: {
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        });
    }
    logger_1.logger.info(`Payment verified for application ${id} by user ${req.user.username}. Auto-transition: ${result.autoTransition ? 'Yes' : 'No'}, Clearance created: ${result.clearanceCreated ? 'Yes' : 'No'}`);
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
router.get('/:id/accounts', auth_1.authenticateToken, (0, validation_1.validateParams)(validation_2.commonSchemas.idParam), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    // Check if application exists
    const application = await prisma.application.findUnique({
        where: { id }
    });
    if (!application) {
        throw (0, errorHandler_1.createError)('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }
    const accountsBreakdown = await (0, accountsService_1.getAccountsBreakdown)(id);
    res.json({
        accountsBreakdown
    });
}));
/**
 * POST /api/applications/:id/reviews
 * Create review for application with optional auto-transition
 */
router.post('/:id/reviews', auth_1.authenticateToken, (0, validation_1.validateParams)(validation_2.commonSchemas.idParam), (0, validation_1.validate)(validation_2.reviewSchemas.create), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { sectionId, remarks, status, autoTransition = false } = req.body;
    // Check if application exists
    const application = await prisma.application.findUnique({
        where: { id }
    });
    if (!application) {
        throw (0, errorHandler_1.createError)('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }
    // Create review
    const result = await (0, reviewService_1.createReview)(id, sectionId, req.user.id, remarks || null, status, autoTransition);
    // Update audit log with IP and user agent
    await prisma.auditLog.updateMany({
        where: {
            applicationId: id,
            userId: req.user.id,
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
                userId: req.user.id,
                action: 'AUTO_STAGE_TRANSITION'
            },
            data: {
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        });
    }
    logger_1.logger.info(`Review created for application ${id} by user ${req.user.username}. Auto-transition: ${result.autoTransition ? 'Yes' : 'No'}`);
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
router.put('/:id/reviews/:reviewId', auth_1.authenticateToken, (0, validation_1.validateParams)(validation_2.commonSchemas.idParam), (0, validation_1.validate)(validation_2.reviewSchemas.update), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id, reviewId } = req.params;
    const { remarks, status, autoTransition = false } = req.body;
    // Check if application exists
    const application = await prisma.application.findUnique({
        where: { id }
    });
    if (!application) {
        throw (0, errorHandler_1.createError)('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }
    // Update review
    const result = await (0, reviewService_1.updateReview)(reviewId, req.user.id, remarks || null, status, autoTransition);
    // Update audit log with IP and user agent
    await prisma.auditLog.updateMany({
        where: {
            applicationId: id,
            userId: req.user.id,
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
                userId: req.user.id,
                action: 'AUTO_STAGE_TRANSITION'
            },
            data: {
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        });
    }
    logger_1.logger.info(`Review updated for application ${id} by user ${req.user.username}. Auto-transition: ${result.autoTransition ? 'Yes' : 'No'}`);
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
router.get('/:id/reviews', auth_1.authenticateToken, (0, validation_1.validateParams)(validation_2.commonSchemas.idParam), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    // Check if application exists
    const application = await prisma.application.findUnique({
        where: { id }
    });
    if (!application) {
        throw (0, errorHandler_1.createError)('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }
    const reviews = await (0, reviewService_1.getReviewsByApplication)(id);
    res.json({
        reviews
    });
}));
/**
 * GET /api/applications/:id/reviews/:reviewId
 * Get specific review by ID
 */
router.get('/:id/reviews/:reviewId', auth_1.authenticateToken, (0, validation_1.validateParams)(validation_2.commonSchemas.idParam), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id, reviewId } = req.params;
    // Check if application exists
    const application = await prisma.application.findUnique({
        where: { id }
    });
    if (!application) {
        throw (0, errorHandler_1.createError)('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }
    const review = await (0, reviewService_1.getReviewById)(reviewId);
    if (!review) {
        throw (0, errorHandler_1.createError)('Review not found', 404, 'REVIEW_NOT_FOUND');
    }
    // Verify review belongs to this application
    if (review.applicationId !== id) {
        throw (0, errorHandler_1.createError)('Review does not belong to this application', 400, 'INVALID_REVIEW');
    }
    res.json({
        review
    });
}));
/**
 * GET /api/applications/:id/reviews/section/:sectionCode
 * Get reviews by section for an application
 */
router.get('/:id/reviews/section/:sectionCode', auth_1.authenticateToken, (0, validation_1.validateParams)(validation_2.commonSchemas.idParam), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id, sectionCode } = req.params;
    // Check if application exists
    const application = await prisma.application.findUnique({
        where: { id }
    });
    if (!application) {
        throw (0, errorHandler_1.createError)('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }
    const reviews = await (0, reviewService_1.getReviewsBySection)(id, sectionCode);
    res.json({
        reviews
    });
}));
/**
 * POST /api/applications/:id/transfer-deed/draft
 * Create transfer deed draft
 */
router.post('/:id/transfer-deed/draft', auth_1.authenticateToken, (0, validation_1.validateParams)(validation_2.commonSchemas.idParam), (0, validation_1.validate)(validation_2.transferDeedSchemas.create), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { witness1Id, witness2Id, deedContent } = req.body;
    // Check if application exists
    const application = await prisma.application.findUnique({
        where: { id }
    });
    if (!application) {
        throw (0, errorHandler_1.createError)('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }
    // Create deed draft
    const result = await (0, deedService_1.createDeedDraft)(id, witness1Id, witness2Id, deedContent || null, req.user.id);
    // Update audit log with IP and user agent
    await prisma.auditLog.updateMany({
        where: {
            applicationId: id,
            userId: req.user.id,
            action: 'DEED_DRAFT_CREATED'
        },
        data: {
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        }
    });
    logger_1.logger.info(`Transfer deed draft created for application ${id} by user ${req.user.username}`);
    res.status(201).json({
        message: 'Transfer deed draft created successfully',
        transferDeed: result.transferDeed
    });
}));
/**
 * PUT /api/applications/:id/transfer-deed/draft
 * Update transfer deed draft
 */
router.put('/:id/transfer-deed/draft', auth_1.authenticateToken, (0, validation_1.validateParams)(validation_2.commonSchemas.idParam), (0, validation_1.validate)(validation_2.transferDeedSchemas.update), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { witness1Id, witness2Id, deedContent } = req.body;
    // Check if application exists
    const application = await prisma.application.findUnique({
        where: { id }
    });
    if (!application) {
        throw (0, errorHandler_1.createError)('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }
    // Update deed draft
    const result = await (0, deedService_1.updateDeedDraft)(id, witness1Id || null, witness2Id || null, deedContent || null, req.user.id);
    // Update audit log with IP and user agent
    await prisma.auditLog.updateMany({
        where: {
            applicationId: id,
            userId: req.user.id,
            action: 'DEED_DRAFT_UPDATED'
        },
        data: {
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        }
    });
    logger_1.logger.info(`Transfer deed draft updated for application ${id} by user ${req.user.username}`);
    res.status(200).json({
        message: 'Transfer deed draft updated successfully',
        transferDeed: result.transferDeed
    });
}));
/**
 * POST /api/applications/:id/transfer-deed/finalize
 * Finalize transfer deed with hash and ownership transfer
 */
router.post('/:id/transfer-deed/finalize', auth_1.authenticateToken, (0, validation_1.validateParams)(validation_2.commonSchemas.idParam), (0, validation_1.validate)(validation_2.transferDeedSchemas.finalize), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { witness1Signature, witness2Signature } = req.body;
    // Check if application exists
    const application = await prisma.application.findUnique({
        where: { id }
    });
    if (!application) {
        throw (0, errorHandler_1.createError)('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }
    // Finalize deed
    const result = await (0, deedService_1.finalizeDeed)(id, witness1Signature, witness2Signature, req.user.id);
    // Update audit log with IP and user agent
    await prisma.auditLog.updateMany({
        where: {
            applicationId: id,
            userId: req.user.id,
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
            userId: req.user.id,
            action: 'OWNERSHIP_TRANSFERRED'
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
                userId: req.user.id,
                action: 'AUTO_STAGE_TRANSITION'
            },
            data: {
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        });
    }
    logger_1.logger.info(`Transfer deed finalized for application ${id} by user ${req.user.username}. Auto-transition: ${result.autoTransition ? 'Yes' : 'No'}, Ownership transferred: ${result.ownershipTransferred ? 'Yes' : 'No'}`);
    res.status(200).json({
        message: 'Transfer deed finalized successfully',
        transferDeed: result.transferDeed,
        autoTransition: result.autoTransition,
        ownershipTransferred: result.ownershipTransferred
    });
}));
/**
 * GET /api/applications/:id/transfer-deed
 * Get transfer deed for application
 */
router.get('/:id/transfer-deed', auth_1.authenticateToken, (0, validation_1.validateParams)(validation_2.commonSchemas.idParam), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    // Check if application exists
    const application = await prisma.application.findUnique({
        where: { id }
    });
    if (!application) {
        throw (0, errorHandler_1.createError)('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }
    const transferDeed = await (0, deedService_1.getTransferDeed)(id);
    res.json({
        transferDeed
    });
}));
exports.default = router;
