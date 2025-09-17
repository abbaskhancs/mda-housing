import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';
import { executeGuard, validateGuardContext } from '../guards/workflowGuards';
import { formatCurrencyInWords } from '../utils/numberToWords';

const prisma = new PrismaClient();

export interface AccountsResult {
  accountsBreakdown: any;
  autoTransition?: {
    fromStage: any;
    toStage: any;
    guard: string;
    guardResult: any;
  };
  clearanceCreated?: any;
}

export interface FeeHeads {
  arrears: number;
  surcharge: number;
  nonUser: number;
  transferFee: number;
  attorneyFee: number;
  water: number;
  suiGas: number;
  additional: number;
}

export const upsertAccountsBreakdown = async (
  applicationId: string,
  feeHeads: FeeHeads,
  challanNo?: string,
  challanDate?: Date,
  userId?: string
): Promise<AccountsResult> => {
  try {
    // Calculate total amount from fee heads
    const totalAmount = Object.values(feeHeads).reduce((sum, amount) => sum + amount, 0);
    const totalAmountWords = formatCurrencyInWords(totalAmount);

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get application with current stage
      const application = await tx.application.findUnique({
        where: { id: applicationId },
        include: {
          currentStage: true,
          accountsBreakdown: true
        }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      // Calculate remaining amount
      const remainingAmount = totalAmount - (Number(application.accountsBreakdown?.paidAmount || 0));

      let accountsBreakdown;
      if (application.accountsBreakdown) {
        // Update existing accounts breakdown
        accountsBreakdown = await tx.accountsBreakdown.update({
          where: { id: application.accountsBreakdown.id },
          data: {
            ...feeHeads,
            totalAmount,
            totalAmountWords,
            remainingAmount,
            ...(challanNo && { challanNo }),
            ...(challanDate && { challanDate }),
            updatedAt: new Date()
          }
        });
      } else {
        // Create new accounts breakdown
        accountsBreakdown = await tx.accountsBreakdown.create({
          data: {
            applicationId,
            ...feeHeads,
            totalAmount,
            totalAmountWords,
            remainingAmount,
            ...(challanNo && { challanNo }),
            ...(challanDate && { challanDate })
          }
        });
      }

      // Create audit log
      if (userId) {
        await tx.auditLog.create({
          data: {
            applicationId,
            userId,
            action: 'ACCOUNTS_UPDATE',
            details: `Accounts breakdown updated: Total: ${totalAmount} (${totalAmountWords}), Remaining: ${remainingAmount}`,
            ipAddress: undefined, // Will be set by the endpoint
            userAgent: undefined // Will be set by the endpoint
          }
        });
      }

      return {
        application,
        accountsBreakdown
      };
    });

    // Check for auto-progress after accounts upsert
    const autoTransition = await checkAutoProgressAfterAccounts(
      applicationId,
      result.application.currentStageId
    );

    return {
      accountsBreakdown: result.accountsBreakdown,
      autoTransition
    };
  } catch (error) {
    logger.error('Error upserting accounts breakdown:', error);
    throw error;
  }
};

export const verifyPayment = async (
  applicationId: string,
  paidAmount: number,
  challanUrl: string | null,
  userId: string
): Promise<AccountsResult> => {
  try {
    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get application with current stage and accounts breakdown
      const application = await tx.application.findUnique({
        where: { id: applicationId },
        include: {
          currentStage: true,
          accountsBreakdown: true
        }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      if (!application.accountsBreakdown) {
        throw new Error('Accounts breakdown not found');
      }

      // Calculate new remaining amount
      const newRemainingAmount = Number(application.accountsBreakdown.totalAmount) - paidAmount;

      if (newRemainingAmount < 0) {
        throw new Error('Paid amount exceeds total amount');
      }

      // Update accounts breakdown
      const updatedAccountsBreakdown = await tx.accountsBreakdown.update({
        where: { id: application.accountsBreakdown.id },
        data: {
          paidAmount,
          remainingAmount: newRemainingAmount,
          challanUrl: challanUrl || application.accountsBreakdown.challanUrl,
          paymentVerified: newRemainingAmount === 0,
          verifiedAt: newRemainingAmount === 0 ? new Date() : null,
          updatedAt: new Date()
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          applicationId,
          userId,
          action: 'PAYMENT_VERIFIED',
          details: `Payment verified: Paid: ${paidAmount}, Remaining: ${newRemainingAmount}`,
          ipAddress: undefined, // Will be set by the endpoint
          userAgent: undefined // Will be set by the endpoint
        }
      });

      return {
        application,
        accountsBreakdown: updatedAccountsBreakdown
      };
    });

    // Check for auto-progress after payment verification
    const autoTransition = await checkAutoProgressAfterPayment(
      applicationId,
      result.application.currentStageId
    );

    // If payment is fully verified, create ACCOUNTS clearance
    let clearanceCreated = null;
    if (result.accountsBreakdown.paymentVerified) {
      clearanceCreated = await createAccountsClearance(applicationId, userId);
    }

    return {
      accountsBreakdown: result.accountsBreakdown,
      autoTransition,
      clearanceCreated
    };
  } catch (error) {
    logger.error('Error verifying payment:', error);
    throw error;
  }
};

const checkAutoProgressAfterAccounts = async (
  applicationId: string,
  currentStageId: string
): Promise<AccountsResult['autoTransition']> => {
  try {
    // Get current stage
    const currentStage = await prisma.wfStage.findUnique({
      where: { id: currentStageId }
    });

    if (!currentStage) {
      return undefined;
    }

    // Check if we should move from ACCOUNTS_PENDING to PAYMENT_PENDING
    if (currentStage.code === 'ACCOUNTS_PENDING') {
      const nextStage = await prisma.wfStage.findFirst({
        where: { code: 'PAYMENT_PENDING' }
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

      if (!validateGuardContext(guardContext)) {
        return undefined;
      }

      const guardResult = await executeGuard('GUARD_ACCOUNTS_CALCULATED', guardContext);

      if (!guardResult.canTransition) {
        logger.warn(`Auto-progress blocked by guard GUARD_ACCOUNTS_CALCULATED: ${guardResult.reason}`);
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
          details: `Auto-transitioned from ${currentStage.code} to ${nextStage.code} after accounts calculation`,
          ipAddress: undefined,
          userAgent: undefined
        }
      });

      logger.info(`Auto-transitioned application ${applicationId} from ${currentStage.code} to ${nextStage.code}`);

      return {
        fromStage: updatedApplication.previousStage,
        toStage: updatedApplication.currentStage,
        guard: 'GUARD_ACCOUNTS_CALCULATED',
        guardResult: {
          reason: guardResult.reason,
          metadata: guardResult.metadata
        }
      };
    }

    return undefined;
  } catch (error) {
    logger.error('Error checking auto-progress after accounts:', error);
    return undefined;
  }
};

const checkAutoProgressAfterPayment = async (
  applicationId: string,
  currentStageId: string
): Promise<AccountsResult['autoTransition']> => {
  try {
    // Get current stage
    const currentStage = await prisma.wfStage.findUnique({
      where: { id: currentStageId }
    });

    if (!currentStage) {
      return undefined;
    }

    // Check if we should move from SENT_TO_ACCOUNTS or AWAITING_PAYMENT to ACCOUNTS_CLEAR
    if (currentStage.code === 'SENT_TO_ACCOUNTS' || currentStage.code === 'AWAITING_PAYMENT') {
      const nextStage = await prisma.wfStage.findFirst({
        where: { code: 'ACCOUNTS_CLEAR' }
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

      if (!validateGuardContext(guardContext)) {
        return undefined;
      }

      const guardResult = await executeGuard('GUARD_ACCOUNTS_CLEAR', guardContext);

      if (!guardResult.canTransition) {
        logger.warn(`Auto-progress blocked by guard GUARD_ACCOUNTS_CLEAR: ${guardResult.reason}`);
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
          details: `Auto-transitioned from ${currentStage.code} to ${nextStage.code} after payment verification`,
          ipAddress: undefined,
          userAgent: undefined
        }
      });

      logger.info(`Auto-transitioned application ${applicationId} from ${currentStage.code} to ${nextStage.code}`);

      return {
        fromStage: updatedApplication.previousStage,
        toStage: updatedApplication.currentStage,
        guard: 'GUARD_ACCOUNTS_CLEAR',
        guardResult: {
          reason: guardResult.reason,
          metadata: guardResult.metadata
        }
      };
    }

    // Check if we should move from PAYMENT_PENDING to READY_FOR_APPROVAL
    if (currentStage.code === 'PAYMENT_PENDING') {
      const nextStage = await prisma.wfStage.findFirst({
        where: { code: 'READY_FOR_APPROVAL' }
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

      if (!validateGuardContext(guardContext)) {
        return undefined;
      }

      const guardResult = await executeGuard('GUARD_PAYMENT_VERIFIED', guardContext);

      if (!guardResult.canTransition) {
        logger.warn(`Auto-progress blocked by guard GUARD_PAYMENT_VERIFIED: ${guardResult.reason}`);
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
          details: `Auto-transitioned from ${currentStage.code} to ${nextStage.code} after payment verification`,
          ipAddress: undefined,
          userAgent: undefined
        }
      });

      logger.info(`Auto-transitioned application ${applicationId} from ${currentStage.code} to ${nextStage.code}`);

      return {
        fromStage: updatedApplication.previousStage,
        toStage: updatedApplication.currentStage,
        guard: 'GUARD_PAYMENT_VERIFIED',
        guardResult: {
          reason: guardResult.reason,
          metadata: guardResult.metadata
        }
      };
    }

    return undefined;
  } catch (error) {
    logger.error('Error checking auto-progress after payment:', error);
    return undefined;
  }
};

const createAccountsClearance = async (applicationId: string, userId: string) => {
  try {
    // Get ACCOUNTS section and CLEAR status
    const [accountsSection, clearStatus] = await Promise.all([
      prisma.wfSection.findFirst({ where: { code: 'ACCOUNTS' } }),
      prisma.wfStatus.findFirst({ where: { code: 'CLEAR' } })
    ]);

    if (!accountsSection || !clearStatus) {
      throw new Error('ACCOUNTS section or CLEAR status not found');
    }

    // Create ACCOUNTS clearance
    const clearance = await prisma.clearance.create({
      data: {
        applicationId,
        sectionId: accountsSection.id,
        statusId: clearStatus.id,
        remarks: 'Payment verified - Accounts cleared',
        clearedAt: new Date()
      },
      include: {
        section: true,
        status: true
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        applicationId,
        userId,
        action: 'CLEARANCE_CREATED',
        details: 'ACCOUNTS clearance automatically created after payment verification',
        ipAddress: undefined,
        userAgent: undefined
      }
    });

    logger.info(`ACCOUNTS clearance created for application ${applicationId}`);

    return clearance;
  } catch (error) {
    logger.error('Error creating ACCOUNTS clearance:', error);
    throw error;
  }
};

export const generateChallan = async (
  applicationId: string,
  userId: string
): Promise<{ accountsBreakdown: any; challanNo: string; challanDate: Date }> => {
  try {
    // Get existing accounts breakdown
    const existingBreakdown = await prisma.accountsBreakdown.findUnique({
      where: { applicationId }
    });

    if (!existingBreakdown) {
      throw new Error('Accounts breakdown not found. Please calculate fees first.');
    }

    // Generate challan number (format: CHAL-YYYYMMDD-XXXX)
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    const challanNo = `CHAL-${dateStr}-${randomSuffix}`;
    const challanDate = today;

    // Update accounts breakdown with challan info
    const updatedBreakdown = await prisma.accountsBreakdown.update({
      where: { id: existingBreakdown.id },
      data: {
        challanNo,
        challanDate,
        updatedAt: new Date()
      },
      include: {
        application: {
          include: {
            seller: true,
            buyer: true,
            plot: true,
            currentStage: true
          }
        }
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        applicationId,
        userId,
        action: 'CHALLAN_GENERATED',
        details: `Challan generated: ${challanNo} dated ${challanDate.toISOString().slice(0, 10)}`,
        ipAddress: undefined,
        userAgent: undefined
      }
    });

    logger.info(`Challan generated for application ${applicationId}: ${challanNo}`);

    return {
      accountsBreakdown: updatedBreakdown,
      challanNo,
      challanDate
    };
  } catch (error) {
    logger.error('Error generating challan:', error);
    throw error;
  }
};

export const getAccountsBreakdown = async (applicationId: string) => {
  return await prisma.accountsBreakdown.findUnique({
    where: { applicationId },
    include: {
      application: {
        include: {
          seller: true,
          buyer: true,
          plot: true,
          currentStage: true
        }
      }
    }
  });
};
