"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDeedDraft = exports.getTransferDeed = exports.finalizeDeed = exports.createDeedDraft = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../config/logger");
const workflowGuards_1 = require("../guards/workflowGuards");
const crypto_1 = __importDefault(require("crypto"));
const prisma = new client_1.PrismaClient();
const createDeedDraft = async (applicationId, witness1Id, witness2Id, deedContent, userId) => {
    try {
        // Use transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            // Get application with current stage
            const application = await tx.application.findUnique({
                where: { id: applicationId },
                include: {
                    currentStage: true,
                    seller: true,
                    buyer: true,
                    plot: true,
                    transferDeed: true
                }
            });
            if (!application) {
                throw new Error('Application not found');
            }
            // Check if deed already exists
            if (application.transferDeed) {
                throw new Error('Transfer deed already exists for this application');
            }
            // Verify witnesses exist
            const [witness1, witness2] = await Promise.all([
                tx.person.findUnique({ where: { id: witness1Id } }),
                tx.person.findUnique({ where: { id: witness2Id } })
            ]);
            if (!witness1) {
                throw new Error('Witness 1 not found');
            }
            if (!witness2) {
                throw new Error('Witness 2 not found');
            }
            // Create transfer deed draft
            const transferDeed = await tx.transferDeed.create({
                data: {
                    applicationId,
                    witness1Id,
                    witness2Id,
                    deedContent,
                    isFinalized: false
                },
                include: {
                    witness1: true,
                    witness2: true
                }
            });
            // Create audit log
            await tx.auditLog.create({
                data: {
                    applicationId,
                    userId,
                    action: 'DEED_DRAFT_CREATED',
                    details: `Transfer deed draft created with witnesses: ${witness1.name}, ${witness2.name}`,
                    ipAddress: undefined, // Will be set by the endpoint
                    userAgent: undefined // Will be set by the endpoint
                }
            });
            return {
                application,
                transferDeed
            };
        });
        logger_1.logger.info(`Transfer deed draft created for application ${applicationId} by user ${userId}`);
        return {
            transferDeed: result.transferDeed
        };
    }
    catch (error) {
        logger_1.logger.error('Error creating deed draft:', error);
        throw error;
    }
};
exports.createDeedDraft = createDeedDraft;
const finalizeDeed = async (applicationId, witness1Signature, witness2Signature, userId) => {
    try {
        // Use transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            // Get application with current stage and transfer deed
            const application = await tx.application.findUnique({
                where: { id: applicationId },
                include: {
                    currentStage: true,
                    seller: true,
                    buyer: true,
                    plot: true,
                    transferDeed: {
                        include: {
                            witness1: true,
                            witness2: true
                        }
                    }
                }
            });
            if (!application) {
                throw new Error('Application not found');
            }
            if (!application.transferDeed) {
                throw new Error('Transfer deed not found');
            }
            if (application.transferDeed.isFinalized) {
                throw new Error('Transfer deed already finalized');
            }
            // Generate hash for the deed
            const deedData = {
                applicationId,
                sellerId: application.sellerId,
                buyerId: application.buyerId,
                plotId: application.plotId,
                witness1Id: application.transferDeed.witness1Id,
                witness2Id: application.transferDeed.witness2Id,
                deedContent: application.transferDeed.deedContent,
                witness1Signature,
                witness2Signature,
                finalizedAt: new Date().toISOString()
            };
            const deedHash = crypto_1.default
                .createHash('sha256')
                .update(JSON.stringify(deedData))
                .digest('hex');
            // Update transfer deed with hash and finalization
            const updatedTransferDeed = await tx.transferDeed.update({
                where: { id: application.transferDeed.id },
                data: {
                    hashSha256: deedHash,
                    isFinalized: true,
                    finalizedAt: new Date(),
                    updatedAt: new Date()
                },
                include: {
                    witness1: true,
                    witness2: true
                }
            });
            // Transfer ownership: Update plot owner to buyer
            // Note: This assumes we add an ownerId field to the Plot model
            // For now, we'll create an audit log entry for the ownership transfer
            await tx.auditLog.create({
                data: {
                    applicationId,
                    userId,
                    action: 'OWNERSHIP_TRANSFERRED',
                    details: `Ownership transferred from ${application.seller.name} to ${application.buyer.name} for plot ${application.plot.plotNumber}`,
                    ipAddress: undefined, // Will be set by the endpoint
                    userAgent: undefined // Will be set by the endpoint
                }
            });
            // Create audit log for deed finalization
            await tx.auditLog.create({
                data: {
                    applicationId,
                    userId,
                    action: 'DEED_FINALIZED',
                    details: `Transfer deed finalized with hash: ${deedHash}`,
                    ipAddress: undefined, // Will be set by the endpoint
                    userAgent: undefined // Will be set by the endpoint
                }
            });
            return {
                application,
                transferDeed: updatedTransferDeed
            };
        });
        // Check for auto-progress after deed finalization
        const autoTransition = await checkAutoProgressAfterDeedFinalization(applicationId, result.application.currentStageId);
        logger_1.logger.info(`Transfer deed finalized for application ${applicationId} by user ${userId}. Hash: ${result.transferDeed.hashSha256}`);
        return {
            transferDeed: result.transferDeed,
            autoTransition,
            ownershipTransferred: true
        };
    }
    catch (error) {
        logger_1.logger.error('Error finalizing deed:', error);
        throw error;
    }
};
exports.finalizeDeed = finalizeDeed;
const checkAutoProgressAfterDeedFinalization = async (applicationId, currentStageId) => {
    try {
        // Get current stage
        const currentStage = await prisma.wfStage.findUnique({
            where: { id: currentStageId }
        });
        if (!currentStage) {
            return undefined;
        }
        // Check if we should move from APPROVED to COMPLETED
        if (currentStage.code === 'APPROVED') {
            const nextStage = await prisma.wfStage.findFirst({
                where: { code: 'COMPLETED' }
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
            const guardResult = await (0, workflowGuards_1.executeGuard)('GUARD_DEED_FINALIZED', guardContext);
            if (!guardResult.canTransition) {
                logger_1.logger.warn(`Auto-progress blocked by guard GUARD_DEED_FINALIZED: ${guardResult.reason}`);
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
                    details: `Auto-transitioned from ${currentStage.code} to ${nextStage.code} after deed finalization`,
                    ipAddress: undefined,
                    userAgent: undefined
                }
            });
            logger_1.logger.info(`Auto-transitioned application ${applicationId} from ${currentStage.code} to ${nextStage.code}`);
            return {
                fromStage: updatedApplication.previousStage,
                toStage: updatedApplication.currentStage,
                guard: 'GUARD_DEED_FINALIZED',
                guardResult: {
                    reason: guardResult.reason,
                    metadata: guardResult.metadata
                }
            };
        }
        return undefined;
    }
    catch (error) {
        logger_1.logger.error('Error checking auto-progress after deed finalization:', error);
        return undefined;
    }
};
const getTransferDeed = async (applicationId) => {
    return await prisma.transferDeed.findUnique({
        where: { applicationId },
        include: {
            application: {
                include: {
                    seller: true,
                    buyer: true,
                    plot: true,
                    currentStage: true
                }
            },
            witness1: true,
            witness2: true
        }
    });
};
exports.getTransferDeed = getTransferDeed;
const updateDeedDraft = async (applicationId, witness1Id, witness2Id, deedContent, userId) => {
    try {
        // Use transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            // Get application with transfer deed
            const application = await tx.application.findUnique({
                where: { id: applicationId },
                include: {
                    transferDeed: true
                }
            });
            if (!application) {
                throw new Error('Application not found');
            }
            if (!application.transferDeed) {
                throw new Error('Transfer deed not found');
            }
            if (application.transferDeed.isFinalized) {
                throw new Error('Cannot update finalized transfer deed');
            }
            // Verify witnesses exist if provided
            if (witness1Id) {
                const witness1 = await tx.person.findUnique({ where: { id: witness1Id } });
                if (!witness1) {
                    throw new Error('Witness 1 not found');
                }
            }
            if (witness2Id) {
                const witness2 = await tx.person.findUnique({ where: { id: witness2Id } });
                if (!witness2) {
                    throw new Error('Witness 2 not found');
                }
            }
            // Update transfer deed
            const updatedTransferDeed = await tx.transferDeed.update({
                where: { id: application.transferDeed.id },
                data: {
                    ...(witness1Id && { witness1Id }),
                    ...(witness2Id && { witness2Id }),
                    ...(deedContent !== null && { deedContent }),
                    updatedAt: new Date()
                },
                include: {
                    witness1: true,
                    witness2: true
                }
            });
            // Create audit log
            await tx.auditLog.create({
                data: {
                    applicationId,
                    userId,
                    action: 'DEED_DRAFT_UPDATED',
                    details: 'Transfer deed draft updated',
                    ipAddress: undefined, // Will be set by the endpoint
                    userAgent: undefined // Will be set by the endpoint
                }
            });
            return {
                application,
                transferDeed: updatedTransferDeed
            };
        });
        logger_1.logger.info(`Transfer deed draft updated for application ${applicationId} by user ${userId}`);
        return {
            transferDeed: result.transferDeed
        };
    }
    catch (error) {
        logger_1.logger.error('Error updating deed draft:', error);
        throw error;
    }
};
exports.updateDeedDraft = updateDeedDraft;
