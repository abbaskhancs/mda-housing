import { PrismaClient } from '@prisma/client';
import { createError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export interface GuardContext {
  applicationId: string;
  userId: string;
  userRole: string;
  fromStageId: string;
  toStageId: string;
  additionalData?: any;
}

export interface GuardResult {
  canTransition: boolean;
  reason?: string;
  metadata?: any;
}

export type GuardFunction = (context: GuardContext) => Promise<GuardResult>;

/**
 * GUARD_INTAKE_COMPLETE: Check if all required documents are uploaded and marked as original seen
 */
export const GUARD_INTAKE_COMPLETE: GuardFunction = async (context: GuardContext): Promise<GuardResult> => {
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
  } catch (error) {
    logger.error('GUARD_INTAKE_COMPLETE error:', error);
    return {
      canTransition: false,
      reason: 'Error checking intake completeness'
    };
  }
};

/**
 * GUARD_SCRUTINY_COMPLETE: Check if OWO has completed initial scrutiny
 */
export const GUARD_SCRUTINY_COMPLETE: GuardFunction = async (context: GuardContext): Promise<GuardResult> => {
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
  } catch (error) {
    logger.error('GUARD_SCRUTINY_COMPLETE error:', error);
    return {
      canTransition: false,
      reason: 'Error checking scrutiny completion'
    };
  }
};

/**
 * GUARD_BCA_CLEAR: Check if BCA clearance is obtained
 */
export const GUARD_BCA_CLEAR: GuardFunction = async (context: GuardContext): Promise<GuardResult> => {
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

    const bcaClearance = application.clearances.find(
      clearance => clearance.section.code === 'BCA' && clearance.status.code === 'CLEAR'
    );

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
  } catch (error) {
    logger.error('GUARD_BCA_CLEAR error:', error);
    return {
      canTransition: false,
      reason: 'Error checking BCA clearance'
    };
  }
};

/**
 * GUARD_BCA_OBJECTION: Check if BCA has raised an objection
 */
export const GUARD_BCA_OBJECTION: GuardFunction = async (context: GuardContext): Promise<GuardResult> => {
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

    const bcaObjection = application.clearances.find(
      clearance => clearance.section.code === 'BCA' && clearance.status.code === 'OBJECTION'
    );

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
  } catch (error) {
    logger.error('GUARD_BCA_OBJECTION error:', error);
    return {
      canTransition: false,
      reason: 'Error checking BCA objection'
    };
  }
};

/**
 * GUARD_HOUSING_CLEAR: Check if Housing clearance is obtained
 */
export const GUARD_HOUSING_CLEAR: GuardFunction = async (context: GuardContext): Promise<GuardResult> => {
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

    const housingClearance = application.clearances.find(
      clearance => clearance.section.code === 'HOUSING' && clearance.status.code === 'CLEAR'
    );

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
  } catch (error) {
    logger.error('GUARD_HOUSING_CLEAR error:', error);
    return {
      canTransition: false,
      reason: 'Error checking Housing clearance'
    };
  }
};

/**
 * GUARD_HOUSING_OBJECTION: Check if Housing has raised an objection
 */
export const GUARD_HOUSING_OBJECTION: GuardFunction = async (context: GuardContext): Promise<GuardResult> => {
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

    const housingObjection = application.clearances.find(
      clearance => clearance.section.code === 'HOUSING' && clearance.status.code === 'OBJECTION'
    );

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
  } catch (error) {
    logger.error('GUARD_HOUSING_OBJECTION error:', error);
    return {
      canTransition: false,
      reason: 'Error checking Housing objection'
    };
  }
};

/**
 * GUARD_CLEARANCES_COMPLETE: Check if both BCA and Housing clearances are obtained
 */
export const GUARD_CLEARANCES_COMPLETE: GuardFunction = async (context: GuardContext): Promise<GuardResult> => {
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

    const bcaClear = application.clearances.find(
      clearance => clearance.section.code === 'BCA' && clearance.status.code === 'CLEAR'
    );

    const housingClear = application.clearances.find(
      clearance => clearance.section.code === 'HOUSING' && clearance.status.code === 'CLEAR'
    );

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
  } catch (error) {
    logger.error('GUARD_CLEARANCES_COMPLETE error:', error);
    return {
      canTransition: false,
      reason: 'Error checking clearances completion'
    };
  }
};

/**
 * GUARD_BCA_RESOLVED: Check if BCA objection has been resolved
 */
export const GUARD_BCA_RESOLVED: GuardFunction = async (context: GuardContext): Promise<GuardResult> => {
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
    const bcaClear = application.clearances.find(
      clearance => clearance.section.code === 'BCA' && clearance.status.code === 'CLEAR'
    );

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
  } catch (error) {
    logger.error('GUARD_BCA_RESOLVED error:', error);
    return {
      canTransition: false,
      reason: 'Error checking BCA resolution'
    };
  }
};

/**
 * GUARD_HOUSING_RESOLVED: Check if Housing objection has been resolved
 */
export const GUARD_HOUSING_RESOLVED: GuardFunction = async (context: GuardContext): Promise<GuardResult> => {
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
    const housingClear = application.clearances.find(
      clearance => clearance.section.code === 'HOUSING' && clearance.status.code === 'CLEAR'
    );

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
  } catch (error) {
    logger.error('GUARD_HOUSING_RESOLVED error:', error);
    return {
      canTransition: false,
      reason: 'Error checking Housing resolution'
    };
  }
};

/**
 * GUARD_ACCOUNTS_CALCULATED: Check if accounts breakdown has been calculated
 */
export const GUARD_ACCOUNTS_CALCULATED: GuardFunction = async (context: GuardContext): Promise<GuardResult> => {
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
  } catch (error) {
    logger.error('GUARD_ACCOUNTS_CALCULATED error:', error);
    return {
      canTransition: false,
      reason: 'Error checking accounts calculation'
    };
  }
};

/**
 * GUARD_PAYMENT_VERIFIED: Check if payment has been verified
 */
export const GUARD_PAYMENT_VERIFIED: GuardFunction = async (context: GuardContext): Promise<GuardResult> => {
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
  } catch (error) {
    logger.error('GUARD_PAYMENT_VERIFIED error:', error);
    return {
      canTransition: false,
      reason: 'Error checking payment verification'
    };
  }
};

/**
 * GUARD_APPROVAL_COMPLETE: Check if approval has been completed
 */
export const GUARD_APPROVAL_COMPLETE: GuardFunction = async (context: GuardContext): Promise<GuardResult> => {
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
  } catch (error) {
    logger.error('GUARD_APPROVAL_COMPLETE error:', error);
    return {
      canTransition: false,
      reason: 'Error checking approval completion'
    };
  }
};

/**
 * GUARD_APPROVAL_REJECTED: Check if approval has been rejected
 */
export const GUARD_APPROVAL_REJECTED: GuardFunction = async (context: GuardContext): Promise<GuardResult> => {
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
  } catch (error) {
    logger.error('GUARD_APPROVAL_REJECTED error:', error);
    return {
      canTransition: false,
      reason: 'Error checking approval rejection'
    };
  }
};

/**
 * GUARD_DEED_FINALIZED: Check if transfer deed has been finalized
 */
export const GUARD_DEED_FINALIZED: GuardFunction = async (context: GuardContext): Promise<GuardResult> => {
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
  } catch (error) {
    logger.error('GUARD_DEED_FINALIZED error:', error);
    return {
      canTransition: false,
      reason: 'Error checking deed finalization'
    };
  }
};

/**
 * GUARDS map - Central registry of all workflow guards
 */
export const GUARDS: Record<string, GuardFunction> = {
  GUARD_INTAKE_COMPLETE,
  GUARD_SCRUTINY_COMPLETE,
  GUARD_BCA_CLEAR,
  GUARD_BCA_OBJECTION,
  GUARD_HOUSING_CLEAR,
  GUARD_HOUSING_OBJECTION,
  GUARD_CLEARANCES_COMPLETE,
  GUARD_BCA_RESOLVED,
  GUARD_HOUSING_RESOLVED,
  GUARD_ACCOUNTS_CALCULATED,
  GUARD_PAYMENT_VERIFIED,
  GUARD_APPROVAL_COMPLETE,
  GUARD_APPROVAL_REJECTED,
  GUARD_DEED_FINALIZED
};

/**
 * Execute a guard function by name
 */
export const executeGuard = async (guardName: string, context: GuardContext): Promise<GuardResult> => {
  const guard = GUARDS[guardName];
  
  if (!guard) {
    logger.warn(`Unknown guard: ${guardName}`);
    return {
      canTransition: false,
      reason: `Unknown guard: ${guardName}`
    };
  }

  try {
    return await guard(context);
  } catch (error) {
    logger.error(`Guard execution error for ${guardName}:`, error);
    return {
      canTransition: false,
      reason: `Guard execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Get all available guard names
 */
export const getAvailableGuards = (): string[] => {
  return Object.keys(GUARDS);
};

/**
 * Validate guard context
 */
export const validateGuardContext = (context: GuardContext): boolean => {
  return !!(
    context.applicationId &&
    context.userId &&
    context.userRole &&
    context.fromStageId &&
    context.toStageId
  );
};
