import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';
import { executeGuard, validateGuardContext } from '../guards/workflowGuards';

const prisma = new PrismaClient();

export interface ClearanceResult {
  clearance: any;
  autoTransition?: {
    fromStage: any;
    toStage: any;
    guard: string;
    guardResult: any;
  };
}

export const createClearance = async (
  applicationId: string,
  sectionId: string,
  statusId: string,
  remarks: string | null,
  userId: string,
  signedPdfUrl?: string
): Promise<ClearanceResult> => {
  try {
    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get application with current stage and existing clearances
      const application = await tx.application.findUnique({
        where: { id: applicationId },
        include: {
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
        throw new Error('Application not found');
      }

      // Get section and status details
      const [section, status] = await Promise.all([
        tx.wfSection.findUnique({ where: { id: sectionId } }),
        tx.wfStatus.findUnique({ where: { id: statusId } })
      ]);

      if (!section) {
        throw new Error('Section not found');
      }
      if (!status) {
        throw new Error('Status not found');
      }

      // Check if clearance already exists for this section
      const existingClearance = application.clearances.find(
        c => c.sectionId === sectionId
      );

      let clearance;
      if (existingClearance) {
        // Update existing clearance
        clearance = await tx.clearance.update({
          where: { id: existingClearance.id },
          data: {
            statusId,
            remarks,
            signedPdfUrl,
            clearedAt: status.code === 'CLEAR' ? new Date() : null,
            updatedAt: new Date()
          },
          include: {
            section: true,
            status: true
          }
        });
      } else {
        // Create new clearance
        clearance = await tx.clearance.create({
          data: {
            applicationId,
            sectionId,
            statusId,
            remarks,
            signedPdfUrl,
            clearedAt: status.code === 'CLEAR' ? new Date() : null
          },
          include: {
            section: true,
            status: true
          }
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          applicationId,
          userId,
          action: 'CLEARANCE_CREATED',
          details: `Clearance ${status.code} for ${section.code} section`,
          ipAddress: undefined, // Will be set by the endpoint
          userAgent: undefined // Will be set by the endpoint
        }
      });

      return {
        application,
        clearance,
        section,
        status
      };
    });

    // Check for auto-progress after clearance creation
    const autoTransition = await checkAutoProgress(
      applicationId,
      result.application.currentStageId,
      result.section.code,
      result.status.code
    );

    return {
      clearance: result.clearance,
      autoTransition
    };
  } catch (error) {
    logger.error('Error creating clearance:', error);
    throw error;
  }
};

const checkAutoProgress = async (
  applicationId: string,
  currentStageId: string,
  sectionCode: string,
  statusCode: string
): Promise<ClearanceResult['autoTransition']> => {
  try {
    // Get current stage
    const currentStage = await prisma.wfStage.findUnique({
      where: { id: currentStageId }
    });

    if (!currentStage) {
      return undefined;
    }

    // Determine next stage based on section and status
    let nextStageCode: string | null = null;
    let guardName: string | null = null;

    if (sectionCode === 'BCA' && statusCode === 'CLEAR') {
      // BCA cleared - check if we should move to BCA_HOUSING_CLEAR
      if (currentStage.code === 'BCA_PENDING') {
        nextStageCode = 'BCA_HOUSING_CLEAR';
        guardName = 'GUARD_BCA_CLEAR';
      }
    } else if (sectionCode === 'HOUSING' && statusCode === 'CLEAR') {
      // Housing cleared - check if we should move to BCA_HOUSING_CLEAR
      if (currentStage.code === 'HOUSING_PENDING') {
        nextStageCode = 'BCA_HOUSING_CLEAR';
        guardName = 'GUARD_HOUSING_CLEAR';
      }
    } else if (sectionCode === 'BCA' && statusCode === 'OBJECTION') {
      // BCA objection - move to ON_HOLD_BCA
      if (currentStage.code === 'BCA_PENDING') {
        nextStageCode = 'ON_HOLD_BCA';
        guardName = 'GUARD_BCA_OBJECTION';
      }
    } else if (sectionCode === 'HOUSING' && statusCode === 'OBJECTION') {
      // Housing objection - move to ON_HOLD_HOUSING
      if (currentStage.code === 'HOUSING_PENDING') {
        nextStageCode = 'ON_HOLD_HOUSING';
        guardName = 'GUARD_HOUSING_OBJECTION';
      }
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

    if (!validateGuardContext(guardContext)) {
      return undefined;
    }

    const guardResult = await executeGuard(guardName, guardContext);

    if (!guardResult.canTransition) {
      logger.warn(`Auto-progress blocked by guard ${guardName}: ${guardResult.reason}`);
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
        details: `Auto-transitioned from ${currentStage.code} to ${nextStage.code} due to ${sectionCode} clearance`,
        ipAddress: undefined,
        userAgent: undefined
      }
    });

    logger.info(`Auto-transitioned application ${applicationId} from ${currentStage.code} to ${nextStage.code}`);

    return {
      fromStage: updatedApplication.previousStage,
      toStage: updatedApplication.currentStage,
      guard: guardName,
      guardResult: {
        reason: guardResult.reason,
        metadata: guardResult.metadata
      }
    };
  } catch (error) {
    logger.error('Error checking auto-progress:', error);
    return undefined;
  }
};

export const getClearancesByApplication = async (applicationId: string) => {
  return await prisma.clearance.findMany({
    where: { applicationId },
    include: {
      section: true,
      status: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

export const getClearanceById = async (clearanceId: string) => {
  return await prisma.clearance.findUnique({
    where: { id: clearanceId },
    include: {
      application: {
        include: {
          seller: true,
          buyer: true,
          plot: true,
          currentStage: true
        }
      },
      section: true,
      status: true
    }
  });
};
