import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';
import { executeGuard, validateGuardContext } from '../guards/workflowGuards';

const prisma = new PrismaClient();

export interface WorkflowTransitionResult {
  success: boolean;
  error?: string;
  application?: any;
  transition?: {
    fromStage: any;
    toStage: any;
    guard: string;
    guardResult: any;
  };
}

/**
 * Execute a workflow transition for an application
 */
export const executeWorkflowTransition = async (
  applicationId: string,
  toStageCode: string,
  userId: string,
  userRole: string,
  additionalData: Record<string, any> = {}
): Promise<WorkflowTransitionResult> => {
  logger.info(`Executing workflow transition for application ${applicationId} to stage ${toStageCode}`);

  try {
    // Get current application with stage
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        currentStage: true,
        accountsBreakdown: true,
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
        success: false,
        error: 'Application not found'
      };
    }

    // Get target stage
    const toStage = await prisma.wfStage.findFirst({
      where: { code: toStageCode }
    });

    if (!toStage) {
      return {
        success: false,
        error: `Target stage ${toStageCode} not found`
      };
    }

    // Find the workflow transition
    const transition = await prisma.wfTransition.findFirst({
      where: {
        fromStageId: application.currentStageId,
        toStageId: toStage.id
      }
    });

    if (!transition) {
      return {
        success: false,
        error: `No transition found from ${application.currentStage.code} to ${toStageCode}`
      };
    }

    // Prepare guard context
    const guardContext = {
      applicationId,
      userId,
      userRole,
      fromStageId: application.currentStageId,
      toStageId: toStage.id,
      additionalData
    };

    // Validate guard context
    if (!validateGuardContext(guardContext)) {
      return {
        success: false,
        error: 'Invalid guard context'
      };
    }

    // Execute guard
    const guardResult = await executeGuard(transition.guardName, guardContext);

    if (!guardResult.canTransition) {
      return {
        success: false,
        error: guardResult.reason
      };
    }

    // Update application stage
    const updatedApplication = await prisma.application.update({
      where: { id: applicationId },
      data: {
        currentStageId: toStage.id,
        previousStageId: application.currentStageId,
        updatedAt: new Date()
      },
      include: {
        currentStage: true,
        previousStage: true,
        accountsBreakdown: true,
        clearances: {
          include: {
            section: true,
            status: true
          }
        }
      }
    });

    // Create audit log for stage transition
    await prisma.auditLog.create({
      data: {
        applicationId,
        userId,
        action: 'STAGE_TRANSITION',
        details: `Stage changed from ${application.currentStage.name} to ${toStage.name}`,
        ipAddress: undefined, // Will be set by the endpoint
        userAgent: undefined // Will be set by the endpoint
      }
    });

    logger.info(`Workflow transition completed: ${application.currentStage.code} → ${toStage.code} for application ${applicationId}`);

    return {
      success: true,
      application: updatedApplication,
      transition: {
        fromStage: application.currentStage,
        toStage: toStage,
        guard: transition.guardName,
        guardResult
      }
    };

  } catch (error) {
    logger.error(`Error executing workflow transition for application ${applicationId}:`, error);
    return {
      success: false,
      error: `Workflow transition failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Get available transitions for an application
 */
export const getAvailableTransitions = async (applicationId: string): Promise<any[]> => {
  try {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        currentStage: true
      }
    });

    if (!application) {
      return [];
    }

    const transitions = await prisma.wfTransition.findMany({
      where: {
        fromStageId: application.currentStageId
      },
      include: {
        fromStage: true,
        toStage: true
      }
    });

    return transitions;
  } catch (error) {
    logger.error(`Error getting available transitions for application ${applicationId}:`, error);
    return [];
  }
};

/**
 * Check if a specific transition is available for an application
 */
export const isTransitionAvailable = async (
  applicationId: string,
  toStageCode: string,
  userId: string,
  userRole: string
): Promise<boolean> => {
  try {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        currentStage: true
      }
    });

    if (!application) {
      return false;
    }

    const toStage = await prisma.wfStage.findFirst({
      where: { code: toStageCode }
    });

    if (!toStage) {
      return false;
    }

    const transition = await prisma.wfTransition.findFirst({
      where: {
        fromStageId: application.currentStageId,
        toStageId: toStage.id
      }
    });

    if (!transition) {
      return false;
    }

    // Check guard
    const guardContext = {
      applicationId,
      userId,
      userRole,
      fromStageId: application.currentStageId,
      toStageId: toStage.id,
      additionalData: {}
    };

    if (!validateGuardContext(guardContext)) {
      return false;
    }

    const guardResult = await executeGuard(transition.guardName, guardContext);
    return guardResult.canTransition;

  } catch (error) {
    logger.error(`Error checking transition availability for application ${applicationId}:`, error);
    return false;
  }
};
