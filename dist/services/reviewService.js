"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReviewsBySection = exports.getReviewById = exports.getReviewsByApplication = exports.updateReview = exports.createReview = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../config/logger");
const workflowGuards_1 = require("../guards/workflowGuards");
const prisma = new client_1.PrismaClient();
const createReview = async (applicationId, sectionId, reviewerId, remarks, status, autoTransition = false) => {
    try {
        // Use transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            // Get application with current stage
            const application = await tx.application.findUnique({
                where: { id: applicationId },
                include: {
                    currentStage: true,
                    reviews: {
                        where: { sectionId },
                        include: { section: true }
                    }
                }
            });
            if (!application) {
                throw new Error('Application not found');
            }
            // Get section details
            const section = await tx.wfSection.findUnique({
                where: { id: sectionId }
            });
            if (!section) {
                throw new Error('Section not found');
            }
            // Check if review already exists for this section
            const existingReview = application.reviews.find(r => r.sectionId === sectionId);
            let review;
            if (existingReview) {
                // Update existing review
                review = await tx.review.update({
                    where: { id: existingReview.id },
                    data: {
                        reviewerId,
                        remarks,
                        status,
                        reviewedAt: status !== 'PENDING' ? new Date() : null,
                        updatedAt: new Date()
                    },
                    include: {
                        section: true
                    }
                });
            }
            else {
                // Create new review
                review = await tx.review.create({
                    data: {
                        applicationId,
                        sectionId,
                        reviewerId,
                        remarks,
                        status,
                        reviewedAt: status !== 'PENDING' ? new Date() : null
                    },
                    include: {
                        section: true
                    }
                });
            }
            // Create audit log
            await tx.auditLog.create({
                data: {
                    applicationId,
                    userId: reviewerId,
                    action: 'REVIEW_CREATED',
                    details: `Review ${status} for ${section.code} section`,
                    ipAddress: undefined, // Will be set by the endpoint
                    userAgent: undefined // Will be set by the endpoint
                }
            });
            return {
                application,
                review,
                section
            };
        });
        // Check for auto-transition if requested and review is approved
        let autoTransitionResult = undefined;
        if (autoTransition && status === 'APPROVED') {
            autoTransitionResult = await checkAutoTransitionAfterReview(applicationId, result.application.currentStageId, result.section.code);
        }
        return {
            review: result.review,
            autoTransition: autoTransitionResult
        };
    }
    catch (error) {
        logger_1.logger.error('Error creating review:', error);
        throw error;
    }
};
exports.createReview = createReview;
const checkAutoTransitionAfterReview = async (applicationId, currentStageId, sectionCode) => {
    try {
        // Get current stage
        const currentStage = await prisma.wfStage.findUnique({
            where: { id: currentStageId }
        });
        if (!currentStage) {
            return undefined;
        }
        // Determine next stage based on section and current stage
        let nextStageCode = null;
        let guardName = null;
        if (sectionCode === 'OWO' && currentStage.code === 'UNDER_SCRUTINY') {
            // OWO review completed - can move to BCA_PENDING or HOUSING_PENDING
            nextStageCode = 'BCA_PENDING'; // Default to BCA_PENDING
            guardName = 'GUARD_SCRUTINY_COMPLETE';
        }
        else if (sectionCode === 'APPROVER' && currentStage.code === 'READY_FOR_APPROVAL') {
            // Approver review completed - can move to APPROVED
            nextStageCode = 'APPROVED';
            guardName = 'GUARD_APPROVAL_COMPLETE';
        }
        if (!nextStageCode || !guardName) {
            return undefined;
        }
        // Get next stage
        const nextStage = await prisma.wfStage.findFirst({
            where: { code: nextStageCode }
        });
        if (!nextStage) {
            return undefined;
        }
        // Execute guard to validate transition
        const guardContext = {
            applicationId,
            userId: '', // Will be set by the endpoint
            userRole: '', // Will be set by the endpoint
            fromStageId: currentStageId,
            toStageId: nextStage.id,
            additionalData: {}
        };
        if (!(0, workflowGuards_1.validateGuardContext)(guardContext)) {
            return undefined;
        }
        const guardResult = await (0, workflowGuards_1.executeGuard)(guardName, guardContext);
        if (!guardResult.canTransition) {
            logger_1.logger.warn(`Auto-transition blocked by guard ${guardName}: ${guardResult.reason}`);
            return undefined;
        }
        // Perform the transition
        const updatedApplication = await prisma.application.update({
            where: { id: applicationId },
            data: {
                previousStageId: currentStageId,
                currentStageId: nextStage.id,
                updatedAt: new Date()
            },
            include: {
                currentStage: true,
                previousStage: true
            }
        });
        // Create audit log for auto-transition
        await prisma.auditLog.create({
            data: {
                applicationId,
                userId: '', // Will be set by the endpoint
                action: 'AUTO_STAGE_TRANSITION',
                fromStageId: currentStageId,
                toStageId: nextStage.id,
                details: `Auto-transitioned from ${currentStage.code} to ${nextStage.code} after ${sectionCode} review`,
                ipAddress: undefined,
                userAgent: undefined
            }
        });
        logger_1.logger.info(`Auto-transitioned application ${applicationId} from ${currentStage.code} to ${nextStage.code} after ${sectionCode} review`);
        return {
            fromStage: updatedApplication.previousStage,
            toStage: updatedApplication.currentStage,
            guard: guardName,
            guardResult: {
                reason: guardResult.reason,
                metadata: guardResult.metadata
            }
        };
    }
    catch (error) {
        logger_1.logger.error('Error checking auto-transition after review:', error);
        return undefined;
    }
};
const updateReview = async (reviewId, reviewerId, remarks, status, autoTransition = false) => {
    try {
        // Use transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            // Get review with application and section
            const existingReview = await tx.review.findUnique({
                where: { id: reviewId },
                include: {
                    application: {
                        include: { currentStage: true }
                    },
                    section: true
                }
            });
            if (!existingReview) {
                throw new Error('Review not found');
            }
            // Update review
            const review = await tx.review.update({
                where: { id: reviewId },
                data: {
                    reviewerId,
                    remarks,
                    status,
                    reviewedAt: status !== 'PENDING' ? new Date() : null,
                    updatedAt: new Date()
                },
                include: {
                    section: true
                }
            });
            // Create audit log
            await tx.auditLog.create({
                data: {
                    applicationId: existingReview.applicationId,
                    userId: reviewerId,
                    action: 'REVIEW_UPDATED',
                    details: `Review updated to ${status} for ${existingReview.section.code} section`,
                    ipAddress: undefined, // Will be set by the endpoint
                    userAgent: undefined // Will be set by the endpoint
                }
            });
            return {
                application: existingReview.application,
                review,
                section: existingReview.section
            };
        });
        // Check for auto-transition if requested and review is approved
        let autoTransitionResult = undefined;
        if (autoTransition && status === 'APPROVED') {
            autoTransitionResult = await checkAutoTransitionAfterReview(result.application.id, result.application.currentStageId, result.section.code);
        }
        return {
            review: result.review,
            autoTransition: autoTransitionResult
        };
    }
    catch (error) {
        logger_1.logger.error('Error updating review:', error);
        throw error;
    }
};
exports.updateReview = updateReview;
const getReviewsByApplication = async (applicationId) => {
    return await prisma.review.findMany({
        where: { applicationId },
        include: {
            section: true
        },
        orderBy: { createdAt: 'desc' }
    });
};
exports.getReviewsByApplication = getReviewsByApplication;
const getReviewById = async (reviewId) => {
    return await prisma.review.findUnique({
        where: { id: reviewId },
        include: {
            application: {
                include: {
                    seller: true,
                    buyer: true,
                    plot: true,
                    currentStage: true
                }
            },
            section: true
        }
    });
};
exports.getReviewById = getReviewById;
const getReviewsBySection = async (applicationId, sectionCode) => {
    return await prisma.review.findMany({
        where: {
            applicationId,
            section: { code: sectionCode }
        },
        include: {
            section: true
        },
        orderBy: { createdAt: 'desc' }
    });
};
exports.getReviewsBySection = getReviewsBySection;
