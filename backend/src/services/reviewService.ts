import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';
import { executeGuard, validateGuardContext } from '../guards/workflowGuards';

const prisma = new PrismaClient();

export interface ReviewResult {
  review: any;
  autoTransition?: {
    fromStage: any;
    toStage: any;
    guard: string;
    guardResult: any;
  };
}

export const createReview = async (
  applicationId: string,
  sectionId: string,
  reviewerId: string,
  remarks: string | null,
  status: 'PENDING' | 'APPROVED' | 'REJECTED',
  autoTransition: boolean = false
): Promise<ReviewResult> => {
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
      } else {
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
    let autoTransitionResult: ReviewResult['autoTransition'] = undefined;
    if (autoTransition && status === 'APPROVED') {
      autoTransitionResult = await checkAutoTransitionAfterReview(
        applicationId,
        result.application.currentStageId,
        result.section.code,
        reviewerId,
        'OWO' // Default role for review auto-transitions
      );
    }

    return {
      review: result.review,
      autoTransition: autoTransitionResult
    };
  } catch (error) {
    logger.error('Error creating review:', error);
    throw error;
  }
};

const checkAutoTransitionAfterReview = async (
  applicationId: string,
  currentStageId: string,
  sectionCode: string,
  userId: string,
  userRole: string
): Promise<ReviewResult['autoTransition']> => {
  try {
    // Get current stage
    const currentStage = await prisma.wfStage.findUnique({
      where: { id: currentStageId }
    });

    if (!currentStage) {
      return undefined;
    }

    // Determine next stage based on section and current stage
    let nextStageCode: string | null = null;
    let guardName: string | null = null;

    if (sectionCode === 'OWO' && currentStage.code === 'UNDER_SCRUTINY') {
      // OWO review completed - can move to BCA_PENDING or HOUSING_PENDING
      nextStageCode = 'BCA_PENDING'; // Default to BCA_PENDING
      guardName = 'GUARD_SCRUTINY_COMPLETE';
    } else if (sectionCode === 'OWO' && currentStage.code === 'BCA_HOUSING_CLEAR') {
      // OWO review for BCA/Housing completed - can move to OWO_REVIEW_BCA_HOUSING
      nextStageCode = 'OWO_REVIEW_BCA_HOUSING';
      guardName = 'GUARD_BCA_HOUSING_REVIEW';
    } else if (sectionCode === 'ACCOUNTS' && currentStage.code === 'ACCOUNTS_CLEAR') {
      // ACCOUNTS review completed - can move to OWO_REVIEW_ACCOUNTS
      nextStageCode = 'OWO_REVIEW_ACCOUNTS';
      guardName = 'GUARD_ACCOUNTS_REVIEWED';
    } else if (sectionCode === 'APPROVER' && currentStage.code === 'READY_FOR_APPROVAL') {
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
      userId,
      userRole,
      fromStageId: currentStageId,
      toStageId: nextStage.id,
      additionalData: {}
    };

    if (!validateGuardContext(guardContext)) {
      return undefined;
    }

    const guardResult = await executeGuard(guardName, guardContext);

    if (!guardResult.canTransition) {
      logger.warn(`Auto-transition blocked by guard ${guardName}: ${guardResult.reason}`);
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
        userId,
        action: 'AUTO_STAGE_TRANSITION',
        fromStageId: currentStageId,
        toStageId: nextStage.id,
        details: `Auto-transitioned from ${currentStage.code} to ${nextStage.code} after ${sectionCode} review`,
        ipAddress: undefined,
        userAgent: undefined
      }
    });

    logger.info(`Auto-transitioned application ${applicationId} from ${currentStage.code} to ${nextStage.code} after ${sectionCode} review`);

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
    logger.error('Error checking auto-transition after review:', error);
    return undefined;
  }
};

export const updateReview = async (
  reviewId: string,
  reviewerId: string,
  remarks: string | null,
  status: 'PENDING' | 'APPROVED' | 'REJECTED',
  autoTransition: boolean = false
): Promise<ReviewResult> => {
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
    let autoTransitionResult: ReviewResult['autoTransition'] = undefined;
    if (autoTransition && status === 'APPROVED') {
      autoTransitionResult = await checkAutoTransitionAfterReview(
        result.application.id,
        result.application.currentStageId,
        result.section.code,
        reviewerId,
        'OWO' // Default role for review auto-transitions
      );
    }

    return {
      review: result.review,
      autoTransition: autoTransitionResult
    };
  } catch (error) {
    logger.error('Error updating review:', error);
    throw error;
  }
};

export const getReviewsByApplication = async (applicationId: string) => {
  return await prisma.review.findMany({
    where: { applicationId },
    include: {
      section: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

export const getReviewById = async (reviewId: string) => {
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

export const getReviewsBySection = async (applicationId: string, sectionCode: string) => {
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
