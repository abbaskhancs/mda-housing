import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';
import { executeGuard, validateGuardContext } from '../guards/workflowGuards';

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

export const upsertAccountsBreakdown = async (
  applicationId: string,
  totalAmount: number,
  challanUrl: string | null,
  userId: string
): Promise<AccountsResult> => {
  try {
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
            totalAmount,
            remainingAmount,
            challanUrl,
            updatedAt: new Date()
          }
        });
      } else {
        // Create new accounts breakdown
        accountsBreakdown = await tx.accountsBreakdown.create({
          data: {
            applicationId,
            totalAmount,
            remainingAmount,
            challanUrl
          }
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          applicationId,
          userId,
          action: 'ACCOUNTS_UPSERTED',
          details: `Accounts breakdown upserted: Total: ${totalAmount}, Remaining: ${remainingAmount}`,
          ipAddress: undefined, // Will be set by the endpoint
          userAgent: undefined // Will be set by the endpoint
        }
      });

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
