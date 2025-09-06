"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../schemas/validation");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../config/logger");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
/**
 * POST /api/applications
 * Create new application
 */
router.post('/', auth_1.authenticateToken, (0, validation_1.validate)(validation_2.applicationSchemas.create), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { sellerId, buyerId, attorneyId, plotId } = req.body;
    // Verify all referenced entities exist
    const [seller, buyer, plot] = await Promise.all([
        prisma.person.findUnique({ where: { id: sellerId } }),
        prisma.person.findUnique({ where: { id: buyerId } }),
        prisma.plot.findUnique({ where: { id: plotId } })
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
        const attorney = await prisma.person.findUnique({ where: { id: attorneyId } });
        if (!attorney) {
            throw (0, errorHandler_1.createError)('Attorney not found', 404, 'ATTORNEY_NOT_FOUND');
        }
    }
    // Get initial stage (SUBMITTED)
    const initialStage = await prisma.wfStage.findFirst({
        where: { code: 'SUBMITTED' },
        orderBy: { sortOrder: 'asc' }
    });
    if (!initialStage) {
        throw (0, errorHandler_1.createError)('Initial workflow stage not found', 500, 'WORKFLOW_ERROR');
    }
    // Create application
    const application = await prisma.application.create({
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
    // Create audit log
    await prisma.auditLog.create({
        data: {
            applicationId: application.id,
            userId: req.user.id,
            action: 'APPLICATION_CREATED',
            toStageId: initialStage.id,
            details: 'Application created and submitted'
        }
    });
    logger_1.logger.info(`Application created: ${application.id} by user ${req.user.username}`);
    res.status(201).json({
        message: 'Application created successfully',
        application
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
exports.default = router;
