"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGuardDescription = exports.validateGuardContext = exports.getAvailableGuards = exports.executeGuard = exports.GUARDS = exports.GUARD_DEED_FINALIZED = exports.GUARD_SENT_TO_BCA_HOUSING = exports.GUARD_APPROVAL_REJECTED = exports.GUARD_APPROVAL_COMPLETE = exports.GUARD_PAYMENT_VERIFIED = exports.GUARD_ACCOUNTS_CALCULATED = exports.GUARD_HOUSING_RESOLVED = exports.GUARD_BCA_RESOLVED = exports.GUARD_CLEARANCES_COMPLETE = exports.GUARD_HOUSING_OBJECTION = exports.GUARD_HOUSING_CLEAR = exports.GUARD_BCA_OBJECTION = exports.GUARD_BCA_CLEAR = exports.GUARD_SCRUTINY_COMPLETE = exports.GUARD_INTAKE_COMPLETE = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../config/logger");
const prisma = new client_1.PrismaClient();
/**
 * GUARD_INTAKE_COMPLETE: Check if all required documents are uploaded and marked as original seen
 */
const GUARD_INTAKE_COMPLETE = async (context) => {
    try {
        const application = await prisma.application.findUnique({
            where: { id: context.applicationId },
            include: {
                attachments: true
            }
        });
        if (!application) {
            return {
                canTransition: false,
                reason: 'Application not found'
            };
        }
        // Required document types for intake
        const requiredDocTypes = [
            'AllotmentLetter',
            'PrevTransferDeed',
            'CNIC_Seller',
            'CNIC_Buyer',
            'UtilityBill_Latest',
            'Photo_Seller',
            'Photo_Buyer'
        ];
        // Check if all required documents are present and marked as original seen
        const uploadedDocs = application.attachments.map(att => att.docType);
        const missingDocs = requiredDocTypes.filter(docType => !uploadedDocs.includes(docType));
        if (missingDocs.length > 0) {
            return {
                canTransition: false,
                reason: `Missing required documents: ${missingDocs.join(', ')}`,
                metadata: { missingDocs }
            };
        }
        // Check if all documents are marked as original seen
        const notSeenDocs = application.attachments
            .filter(att => requiredDocTypes.includes(att.docType) && !att.isOriginalSeen)
            .map(att => att.docType);
        if (notSeenDocs.length > 0) {
            return {
                canTransition: false,
                reason: `Documents not marked as original seen: ${notSeenDocs.join(', ')}`,
                metadata: { notSeenDocs }
            };
        }
        return {
            canTransition: true,
            reason: 'All required documents uploaded and verified',
            metadata: { uploadedDocs: uploadedDocs.length }
        };
    }
    catch (error) {
        logger_1.logger.error('GUARD_INTAKE_COMPLETE error:', error);
        return {
            canTransition: false,
            reason: 'Error checking intake completeness'
        };
    }
};
exports.GUARD_INTAKE_COMPLETE = GUARD_INTAKE_COMPLETE;
/**
 * GUARD_SCRUTINY_COMPLETE: Check if OWO has completed initial scrutiny
 */
const GUARD_SCRUTINY_COMPLETE = async (context) => {
    try {
        // Only OWO role can complete scrutiny
        if (context.userRole !== 'OWO') {
            return {
                canTransition: false,
                reason: 'Only OWO can complete scrutiny'
            };
        }
        const application = await prisma.application.findUnique({
            where: { id: context.applicationId },
            include: {
                reviews: {
                    where: {
                        section: {
                            code: 'OWO'
                        }
                    }
                }
            }
        });
        if (!application) {
            return {
                canTransition: false,
                reason: 'Application not found'
            };
        }
        // Check if OWO has completed review
        const owoReview = application.reviews.find(review => review.status === 'APPROVED');
        if (!owoReview) {
            return {
                canTransition: false,
                reason: 'OWO review not completed'
            };
        }
        return {
            canTransition: true,
            reason: 'OWO scrutiny completed',
            metadata: { reviewId: owoReview.id }
        };
    }
    catch (error) {
        logger_1.logger.error('GUARD_SCRUTINY_COMPLETE error:', error);
        return {
            canTransition: false,
            reason: 'Error checking scrutiny completion'
        };
    }
};
exports.GUARD_SCRUTINY_COMPLETE = GUARD_SCRUTINY_COMPLETE;
/**
 * GUARD_BCA_CLEAR: Check if BCA clearance is obtained
 */
const GUARD_BCA_CLEAR = async (context) => {
    try {
        const application = await prisma.application.findUnique({
            where: { id: context.applicationId },
            include: {
                clearances: {
                    include: {
                        section: true,
                        status: true
                    }
                }
            }
        });
        if (!application) {
            return {
                canTransition: false,
                reason: 'Application not found'
            };
        }
        const bcaClearance = application.clearances.find(clearance => clearance.section.code === 'BCA' && clearance.status.code === 'CLEAR');
        if (!bcaClearance) {
            return {
                canTransition: false,
                reason: 'BCA clearance not obtained'
            };
        }
        return {
            canTransition: true,
            reason: 'BCA clearance obtained',
            metadata: { clearanceId: bcaClearance.id }
        };
    }
    catch (error) {
        logger_1.logger.error('GUARD_BCA_CLEAR error:', error);
        return {
            canTransition: false,
            reason: 'Error checking BCA clearance'
        };
    }
};
exports.GUARD_BCA_CLEAR = GUARD_BCA_CLEAR;
/**
 * GUARD_BCA_OBJECTION: Check if BCA has raised an objection
 */
const GUARD_BCA_OBJECTION = async (context) => {
    try {
        const application = await prisma.application.findUnique({
            where: { id: context.applicationId },
            include: {
                clearances: {
                    include: {
                        section: true,
                        status: true
                    }
                }
            }
        });
        if (!application) {
            return {
                canTransition: false,
                reason: 'Application not found'
            };
        }
        const bcaObjection = application.clearances.find(clearance => clearance.section.code === 'BCA' && clearance.status.code === 'OBJECTION');
        if (!bcaObjection) {
            return {
                canTransition: false,
                reason: 'BCA objection not found'
            };
        }
        return {
            canTransition: true,
            reason: 'BCA objection raised',
            metadata: { clearanceId: bcaObjection.id }
        };
    }
    catch (error) {
        logger_1.logger.error('GUARD_BCA_OBJECTION error:', error);
        return {
            canTransition: false,
            reason: 'Error checking BCA objection'
        };
    }
};
exports.GUARD_BCA_OBJECTION = GUARD_BCA_OBJECTION;
/**
 * GUARD_HOUSING_CLEAR: Check if Housing clearance is obtained
 */
const GUARD_HOUSING_CLEAR = async (context) => {
    try {
        const application = await prisma.application.findUnique({
            where: { id: context.applicationId },
            include: {
                clearances: {
                    include: {
                        section: true,
                        status: true
                    }
                }
            }
        });
        if (!application) {
            return {
                canTransition: false,
                reason: 'Application not found'
            };
        }
        const housingClearance = application.clearances.find(clearance => clearance.section.code === 'HOUSING' && clearance.status.code === 'CLEAR');
        if (!housingClearance) {
            return {
                canTransition: false,
                reason: 'Housing clearance not obtained'
            };
        }
        return {
            canTransition: true,
            reason: 'Housing clearance obtained',
            metadata: { clearanceId: housingClearance.id }
        };
    }
    catch (error) {
        logger_1.logger.error('GUARD_HOUSING_CLEAR error:', error);
        return {
            canTransition: false,
            reason: 'Error checking Housing clearance'
        };
    }
};
exports.GUARD_HOUSING_CLEAR = GUARD_HOUSING_CLEAR;
/**
 * GUARD_HOUSING_OBJECTION: Check if Housing has raised an objection
 */
const GUARD_HOUSING_OBJECTION = async (context) => {
    try {
        const application = await prisma.application.findUnique({
            where: { id: context.applicationId },
            include: {
                clearances: {
                    include: {
                        section: true,
                        status: true
                    }
                }
            }
        });
        if (!application) {
            return {
                canTransition: false,
                reason: 'Application not found'
            };
        }
        const housingObjection = application.clearances.find(clearance => clearance.section.code === 'HOUSING' && clearance.status.code === 'OBJECTION');
        if (!housingObjection) {
            return {
                canTransition: false,
                reason: 'Housing objection not found'
            };
        }
        return {
            canTransition: true,
            reason: 'Housing objection raised',
            metadata: { clearanceId: housingObjection.id }
        };
    }
    catch (error) {
        logger_1.logger.error('GUARD_HOUSING_OBJECTION error:', error);
        return {
            canTransition: false,
            reason: 'Error checking Housing objection'
        };
    }
};
exports.GUARD_HOUSING_OBJECTION = GUARD_HOUSING_OBJECTION;
/**
 * GUARD_CLEARANCES_COMPLETE: Check if both BCA and Housing clearances are obtained
 */
const GUARD_CLEARANCES_COMPLETE = async (context) => {
    try {
        const application = await prisma.application.findUnique({
            where: { id: context.applicationId },
            include: {
                clearances: {
                    include: {
                        section: true,
                        status: true
                    }
                }
            }
        });
        if (!application) {
            return {
                canTransition: false,
                reason: 'Application not found'
            };
        }
        const bcaClear = application.clearances.find(clearance => clearance.section.code === 'BCA' && clearance.status.code === 'CLEAR');
        const housingClear = application.clearances.find(clearance => clearance.section.code === 'HOUSING' && clearance.status.code === 'CLEAR');
        if (!bcaClear) {
            return {
                canTransition: false,
                reason: 'BCA clearance not obtained'
            };
        }
        if (!housingClear) {
            return {
                canTransition: false,
                reason: 'Housing clearance not obtained'
            };
        }
        return {
            canTransition: true,
            reason: 'Both BCA and Housing clearances obtained',
            metadata: {
                bcaClearanceId: bcaClear.id,
                housingClearanceId: housingClear.id
            }
        };
    }
    catch (error) {
        logger_1.logger.error('GUARD_CLEARANCES_COMPLETE error:', error);
        return {
            canTransition: false,
            reason: 'Error checking clearances completion'
        };
    }
};
exports.GUARD_CLEARANCES_COMPLETE = GUARD_CLEARANCES_COMPLETE;
/**
 * GUARD_BCA_RESOLVED: Check if BCA objection has been resolved
 */
const GUARD_BCA_RESOLVED = async (context) => {
    try {
        const application = await prisma.application.findUnique({
            where: { id: context.applicationId },
            include: {
                clearances: {
                    include: {
                        section: true,
                        status: true
                    }
                }
            }
        });
        if (!application) {
            return {
                canTransition: false,
                reason: 'Application not found'
            };
        }
        // Check if there's a BCA clearance with CLEAR status (objection resolved)
        const bcaClear = application.clearances.find(clearance => clearance.section.code === 'BCA' && clearance.status.code === 'CLEAR');
        if (!bcaClear) {
            return {
                canTransition: false,
                reason: 'BCA objection not resolved'
            };
        }
        return {
            canTransition: true,
            reason: 'BCA objection resolved',
            metadata: { clearanceId: bcaClear.id }
        };
    }
    catch (error) {
        logger_1.logger.error('GUARD_BCA_RESOLVED error:', error);
        return {
            canTransition: false,
            reason: 'Error checking BCA resolution'
        };
    }
};
exports.GUARD_BCA_RESOLVED = GUARD_BCA_RESOLVED;
/**
 * GUARD_HOUSING_RESOLVED: Check if Housing objection has been resolved
 */
const GUARD_HOUSING_RESOLVED = async (context) => {
    try {
        const application = await prisma.application.findUnique({
            where: { id: context.applicationId },
            include: {
                clearances: {
                    include: {
                        section: true,
                        status: true
                    }
                }
            }
        });
        if (!application) {
            return {
                canTransition: false,
                reason: 'Application not found'
            };
        }
        // Check if there's a Housing clearance with CLEAR status (objection resolved)
        const housingClear = application.clearances.find(clearance => clearance.section.code === 'HOUSING' && clearance.status.code === 'CLEAR');
        if (!housingClear) {
            return {
                canTransition: false,
                reason: 'Housing objection not resolved'
            };
        }
        return {
            canTransition: true,
            reason: 'Housing objection resolved',
            metadata: { clearanceId: housingClear.id }
        };
    }
    catch (error) {
        logger_1.logger.error('GUARD_HOUSING_RESOLVED error:', error);
        return {
            canTransition: false,
            reason: 'Error checking Housing resolution'
        };
    }
};
exports.GUARD_HOUSING_RESOLVED = GUARD_HOUSING_RESOLVED;
/**
 * GUARD_ACCOUNTS_CALCULATED: Check if accounts breakdown has been calculated
 */
const GUARD_ACCOUNTS_CALCULATED = async (context) => {
    try {
        const application = await prisma.application.findUnique({
            where: { id: context.applicationId },
            include: {
                accountsBreakdown: true
            }
        });
        if (!application) {
            return {
                canTransition: false,
                reason: 'Application not found'
            };
        }
        if (!application.accountsBreakdown) {
            return {
                canTransition: false,
                reason: 'Accounts breakdown not calculated'
            };
        }
        if (Number(application.accountsBreakdown.totalAmount) <= 0) {
            return {
                canTransition: false,
                reason: 'Invalid total amount in accounts breakdown'
            };
        }
        return {
            canTransition: true,
            reason: 'Accounts breakdown calculated',
            metadata: {
                totalAmount: application.accountsBreakdown.totalAmount,
                breakdownId: application.accountsBreakdown.id
            }
        };
    }
    catch (error) {
        logger_1.logger.error('GUARD_ACCOUNTS_CALCULATED error:', error);
        return {
            canTransition: false,
            reason: 'Error checking accounts calculation'
        };
    }
};
exports.GUARD_ACCOUNTS_CALCULATED = GUARD_ACCOUNTS_CALCULATED;
/**
 * GUARD_PAYMENT_VERIFIED: Check if payment has been verified
 */
const GUARD_PAYMENT_VERIFIED = async (context) => {
    try {
        const application = await prisma.application.findUnique({
            where: { id: context.applicationId },
            include: {
                accountsBreakdown: true
            }
        });
        if (!application) {
            return {
                canTransition: false,
                reason: 'Application not found'
            };
        }
        if (!application.accountsBreakdown) {
            return {
                canTransition: false,
                reason: 'Accounts breakdown not found'
            };
        }
        if (!application.accountsBreakdown.paymentVerified) {
            return {
                canTransition: false,
                reason: 'Payment not verified'
            };
        }
        if (Number(application.accountsBreakdown.paidAmount) < Number(application.accountsBreakdown.totalAmount)) {
            return {
                canTransition: false,
                reason: 'Insufficient payment amount'
            };
        }
        return {
            canTransition: true,
            reason: 'Payment verified',
            metadata: {
                paidAmount: application.accountsBreakdown.paidAmount,
                totalAmount: application.accountsBreakdown.totalAmount
            }
        };
    }
    catch (error) {
        logger_1.logger.error('GUARD_PAYMENT_VERIFIED error:', error);
        return {
            canTransition: false,
            reason: 'Error checking payment verification'
        };
    }
};
exports.GUARD_PAYMENT_VERIFIED = GUARD_PAYMENT_VERIFIED;
/**
 * GUARD_APPROVAL_COMPLETE: Check if approval has been completed
 */
const GUARD_APPROVAL_COMPLETE = async (context) => {
    try {
        // Only APPROVER role can complete approval
        if (context.userRole !== 'APPROVER') {
            return {
                canTransition: false,
                reason: 'Only APPROVER can complete approval'
            };
        }
        const application = await prisma.application.findUnique({
            where: { id: context.applicationId },
            include: {
                reviews: {
                    where: {
                        section: {
                            code: 'APPROVER'
                        }
                    }
                }
            }
        });
        if (!application) {
            return {
                canTransition: false,
                reason: 'Application not found'
            };
        }
        const approverReview = application.reviews.find(review => review.status === 'APPROVED');
        if (!approverReview) {
            return {
                canTransition: false,
                reason: 'Approver review not completed'
            };
        }
        return {
            canTransition: true,
            reason: 'Approval completed',
            metadata: { reviewId: approverReview.id }
        };
    }
    catch (error) {
        logger_1.logger.error('GUARD_APPROVAL_COMPLETE error:', error);
        return {
            canTransition: false,
            reason: 'Error checking approval completion'
        };
    }
};
exports.GUARD_APPROVAL_COMPLETE = GUARD_APPROVAL_COMPLETE;
/**
 * GUARD_APPROVAL_REJECTED: Check if approval has been rejected
 */
const GUARD_APPROVAL_REJECTED = async (context) => {
    try {
        // Only APPROVER role can reject approval
        if (context.userRole !== 'APPROVER') {
            return {
                canTransition: false,
                reason: 'Only APPROVER can reject approval'
            };
        }
        const application = await prisma.application.findUnique({
            where: { id: context.applicationId },
            include: {
                reviews: {
                    where: {
                        section: {
                            code: 'APPROVER'
                        }
                    }
                }
            }
        });
        if (!application) {
            return {
                canTransition: false,
                reason: 'Application not found'
            };
        }
        const approverReview = application.reviews.find(review => review.status === 'REJECTED');
        if (!approverReview) {
            return {
                canTransition: false,
                reason: 'Approver rejection not found'
            };
        }
        return {
            canTransition: true,
            reason: 'Approval rejected',
            metadata: { reviewId: approverReview.id }
        };
    }
    catch (error) {
        logger_1.logger.error('GUARD_APPROVAL_REJECTED error:', error);
        return {
            canTransition: false,
            reason: 'Error checking approval rejection'
        };
    }
};
exports.GUARD_APPROVAL_REJECTED = GUARD_APPROVAL_REJECTED;
/**
 * GUARD_SENT_TO_BCA_HOUSING: Create pending clearances for BCA and Housing when transitioning to SENT_TO_BCA_HOUSING
 */
const GUARD_SENT_TO_BCA_HOUSING = async (context) => {
    try {
        const application = await prisma.application.findUnique({
            where: { id: context.applicationId },
            include: {
                clearances: {
                    include: {
                        section: true,
                        status: true
                    }
                }
            }
        });
        if (!application) {
            return {
                canTransition: false,
                reason: 'Application not found'
            };
        }
        // Get BCA and Housing sections, and PENDING status
        const [bcaSection, housingSection, pendingStatus] = await Promise.all([
            prisma.wfSection.findFirst({ where: { code: 'BCA' } }),
            prisma.wfSection.findFirst({ where: { code: 'HOUSING' } }),
            prisma.wfStatus.findFirst({ where: { code: 'PENDING' } })
        ]);
        if (!bcaSection || !housingSection || !pendingStatus) {
            return {
                canTransition: false,
                reason: 'Required sections or status not found'
            };
        }
        // Check if clearances already exist
        const existingBcaClearance = application.clearances.find(clearance => clearance.sectionId === bcaSection.id);
        const existingHousingClearance = application.clearances.find(clearance => clearance.sectionId === housingSection.id);
        // Create pending clearances if they don't exist
        const clearancesToCreate = [];
        if (!existingBcaClearance) {
            clearancesToCreate.push({
                applicationId: context.applicationId,
                sectionId: bcaSection.id,
                statusId: pendingStatus.id,
                remarks: 'Sent to BCA for clearance'
            });
        }
        if (!existingHousingClearance) {
            clearancesToCreate.push({
                applicationId: context.applicationId,
                sectionId: housingSection.id,
                statusId: pendingStatus.id,
                remarks: 'Sent to Housing for clearance'
            });
        }
        // Create clearances in a transaction
        if (clearancesToCreate.length > 0) {
            await prisma.$transaction(async (tx) => {
                for (const clearanceData of clearancesToCreate) {
                    await tx.clearance.create({
                        data: clearanceData
                    });
                }
                // Create audit log entries
                for (const clearanceData of clearancesToCreate) {
                    const section = clearanceData.sectionId === bcaSection.id ? 'BCA' : 'HOUSING';
                    await tx.auditLog.create({
                        data: {
                            applicationId: context.applicationId,
                            userId: context.userId,
                            action: 'CLEARANCE_CREATED',
                            details: `Pending clearance created for ${section} section`,
                            ipAddress: undefined,
                            userAgent: undefined
                        }
                    });
                }
            });
        }
        return {
            canTransition: true,
            reason: 'Application sent to BCA & Housing with pending clearances created',
            metadata: {
                clearancesCreated: clearancesToCreate.length,
                bcaExists: !!existingBcaClearance,
                housingExists: !!existingHousingClearance
            }
        };
    }
    catch (error) {
        logger_1.logger.error('GUARD_SENT_TO_BCA_HOUSING error:', error);
        return {
            canTransition: false,
            reason: 'Error creating pending clearances'
        };
    }
};
exports.GUARD_SENT_TO_BCA_HOUSING = GUARD_SENT_TO_BCA_HOUSING;
/**
 * GUARD_DEED_FINALIZED: Check if transfer deed has been finalized
 */
const GUARD_DEED_FINALIZED = async (context) => {
    try {
        const application = await prisma.application.findUnique({
            where: { id: context.applicationId },
            include: {
                transferDeed: true
            }
        });
        if (!application) {
            return {
                canTransition: false,
                reason: 'Application not found'
            };
        }
        if (!application.transferDeed) {
            return {
                canTransition: false,
                reason: 'Transfer deed not created'
            };
        }
        if (!application.transferDeed.isFinalized) {
            return {
                canTransition: false,
                reason: 'Transfer deed not finalized'
            };
        }
        if (!application.transferDeed.hashSha256) {
            return {
                canTransition: false,
                reason: 'Transfer deed hash not generated'
            };
        }
        return {
            canTransition: true,
            reason: 'Transfer deed finalized',
            metadata: {
                deedId: application.transferDeed.id,
                finalizedAt: application.transferDeed.finalizedAt
            }
        };
    }
    catch (error) {
        logger_1.logger.error('GUARD_DEED_FINALIZED error:', error);
        return {
            canTransition: false,
            reason: 'Error checking deed finalization'
        };
    }
};
exports.GUARD_DEED_FINALIZED = GUARD_DEED_FINALIZED;
/**
 * GUARDS map - Central registry of all workflow guards
 */
exports.GUARDS = {
    GUARD_INTAKE_COMPLETE: exports.GUARD_INTAKE_COMPLETE,
    GUARD_SCRUTINY_COMPLETE: exports.GUARD_SCRUTINY_COMPLETE,
    GUARD_SENT_TO_BCA_HOUSING: exports.GUARD_SENT_TO_BCA_HOUSING,
    GUARD_BCA_CLEAR: exports.GUARD_BCA_CLEAR,
    GUARD_BCA_OBJECTION: exports.GUARD_BCA_OBJECTION,
    GUARD_HOUSING_CLEAR: exports.GUARD_HOUSING_CLEAR,
    GUARD_HOUSING_OBJECTION: exports.GUARD_HOUSING_OBJECTION,
    GUARD_CLEARANCES_COMPLETE: exports.GUARD_CLEARANCES_COMPLETE,
    GUARD_BCA_RESOLVED: exports.GUARD_BCA_RESOLVED,
    GUARD_HOUSING_RESOLVED: exports.GUARD_HOUSING_RESOLVED,
    GUARD_ACCOUNTS_CALCULATED: exports.GUARD_ACCOUNTS_CALCULATED,
    GUARD_PAYMENT_VERIFIED: exports.GUARD_PAYMENT_VERIFIED,
    GUARD_APPROVAL_COMPLETE: exports.GUARD_APPROVAL_COMPLETE,
    GUARD_APPROVAL_REJECTED: exports.GUARD_APPROVAL_REJECTED,
    GUARD_DEED_FINALIZED: exports.GUARD_DEED_FINALIZED
};
/**
 * Execute a guard function by name
 */
const executeGuard = async (guardName, context) => {
    const guard = exports.GUARDS[guardName];
    if (!guard) {
        logger_1.logger.warn(`Unknown guard: ${guardName}`);
        return {
            canTransition: false,
            reason: `Unknown guard: ${guardName}`
        };
    }
    try {
        return await guard(context);
    }
    catch (error) {
        logger_1.logger.error(`Guard execution error for ${guardName}:`, error);
        return {
            canTransition: false,
            reason: `Guard execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
};
exports.executeGuard = executeGuard;
/**
 * Get all available guard names
 */
const getAvailableGuards = () => {
    return Object.keys(exports.GUARDS);
};
exports.getAvailableGuards = getAvailableGuards;
/**
 * Validate guard context
 */
const validateGuardContext = (context) => {
    return !!(context.applicationId &&
        context.userId &&
        context.userRole &&
        context.fromStageId &&
        context.toStageId);
};
exports.validateGuardContext = validateGuardContext;
/**
 * Get guard description by name
 */
const getGuardDescription = (guardName) => {
    const descriptions = {
        'GUARD_INTAKE_COMPLETE': 'Check if all required documents are uploaded and marked as original seen',
        'GUARD_SCRUTINY_COMPLETE': 'Check if OWO has completed initial scrutiny',
        'GUARD_BCA_CLEAR': 'Check if BCA clearance is obtained',
        'GUARD_BCA_OBJECTION': 'Check if BCA has raised an objection',
        'GUARD_HOUSING_CLEAR': 'Check if Housing clearance is obtained',
        'GUARD_HOUSING_OBJECTION': 'Check if Housing has raised an objection',
        'GUARD_CLEARANCES_COMPLETE': 'Check if both BCA and Housing clearances are obtained',
        'GUARD_BCA_RESOLVED': 'Check if BCA objection has been resolved',
        'GUARD_HOUSING_RESOLVED': 'Check if Housing objection has been resolved',
        'GUARD_ACCOUNTS_CALCULATED': 'Check if accounts breakdown has been calculated',
        'GUARD_PAYMENT_VERIFIED': 'Check if payment has been verified',
        'GUARD_APPROVAL_COMPLETE': 'Check if approval has been completed',
        'GUARD_APPROVAL_REJECTED': 'Check if approval has been rejected',
        'GUARD_DEED_FINALIZED': 'Check if transfer deed has been finalized'
    };
    return descriptions[guardName] || 'No description available';
};
exports.getGuardDescription = getGuardDescription;
