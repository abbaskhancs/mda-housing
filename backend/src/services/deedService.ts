import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';
import { executeGuard, validateGuardContext } from '../guards/workflowGuards';
import { executeWorkflowTransition } from './workflowService';
import crypto from 'crypto';
import { documentService } from './documentService';
import { PDFTemplateData } from './pdfService';

const prisma = new PrismaClient();

export interface DeedResult {
  transferDeed: any;
  stageTransition?: {
    fromStage: any;
    toStage: any;
    guard: string;
    guardResult: any;
  };
  autoTransition?: {
    fromStage: any;
    toStage: any;
    guard: string;
    guardResult: any;
  };
  ownershipTransferred?: boolean;
}

export const createDeedDraft = async (
  applicationId: string,
  witness1Id: string,
  witness2Id: string,
  deedContent: string | null,
  userId: string
): Promise<DeedResult> => {
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

      // Create transfer deed draft (without PDF URL initially)
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
          action: 'DEED_DRAFTED',
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

    // Generate and store deed draft PDF
    try {
      const templateData: PDFTemplateData = {
        application: {
          id: result.application.id,
          applicationNumber: result.application.applicationNumber || result.application.id,
          submittedAt: result.application.submittedAt,
          currentStage: result.application.currentStage?.name || 'Unknown'
        },
        seller: {
          name: result.application.seller.name,
          cnic: result.application.seller.cnic,
          phone: result.application.seller.phone,
          address: result.application.seller.address
        },
        buyer: {
          name: result.application.buyer.name,
          cnic: result.application.buyer.cnic,
          phone: result.application.buyer.phone,
          address: result.application.buyer.address
        },
        plot: {
          plotNumber: result.application.plot.plotNumber,
          blockNumber: result.application.plot.blockNumber,
          sectorNumber: result.application.plot.sectorNumber,
          area: result.application.plot.area,
          location: result.application.plot.location
        },
        transferDeed: {
          id: result.transferDeed.id,
          witness1Name: result.transferDeed.witness1.name,
          witness2Name: result.transferDeed.witness2.name,
          deedContent: result.transferDeed.deedContent,
          isFinalized: result.transferDeed.isFinalized,
          createdAt: result.transferDeed.createdAt,
          hashSha256: result.transferDeed.hashSha256
        }
      };

      // Generate deed PDF using document service
      const deedDocument = await documentService.generateDocument({
        applicationId,
        documentType: 'TRANSFER_DEED',
        templateData,
        expiresInHours: 24 * 7 // 7 days
      });

      // Update transfer deed with PDF URL
      const updatedTransferDeed = await prisma.transferDeed.update({
        where: { id: result.transferDeed.id },
        data: { deedPdfUrl: deedDocument.downloadUrl },
        include: {
          witness1: true,
          witness2: true
        }
      });

      logger.info(`Transfer deed draft created and PDF generated for application ${applicationId} by user ${userId}`);

      return {
        transferDeed: updatedTransferDeed
      };
    } catch (pdfError) {
      logger.error('Error generating deed draft PDF:', pdfError);
      // Return the deed without PDF URL if generation fails
      logger.info(`Transfer deed draft created for application ${applicationId} by user ${userId} (PDF generation failed)`);

      return {
        transferDeed: result.transferDeed
      };
    }
  } catch (error) {
    logger.error('Error creating deed draft:', error);
    throw error;
  }
};

export const finalizeDeed = async (
  applicationId: string,
  witness1Signature: string,
  witness2Signature: string,
  finalPdfUrl: string,
  userId: string
): Promise<DeedResult> => {
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
        finalPdfUrl,
        finalizedAt: new Date().toISOString()
      };

      const deedHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(deedData))
        .digest('hex');

      // Update transfer deed with hash and finalization
      const updatedTransferDeed = await tx.transferDeed.update({
        where: { id: application.transferDeed.id },
        data: {
          hashSha256: deedHash,
          finalPdfUrl,
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
      await tx.plot.update({
        where: { id: application.plotId },
        data: {
          currentOwnerId: application.buyerId,
          updatedAt: new Date()
        }
      });

      // Create audit log entry for the ownership transfer
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

    // Transition to APPROVED stage after deed finalization
    let stageTransition = null;
    if (result.application.currentStage.code === 'READY_FOR_APPROVAL') {
      const transitionResult = await executeWorkflowTransition(
        applicationId,
        'APPROVED',
        userId,
        'APPROVER', // Assume the user finalizing the deed has APPROVER role
        { deedFinalized: true, deedHash: result.transferDeed.hashSha256 }
      );

      if (transitionResult.success) {
        stageTransition = transitionResult.transition;
        logger.info(`Application ${applicationId} transitioned to APPROVED after deed finalization`);
      } else {
        logger.warn(`Failed to transition application ${applicationId} to APPROVED: ${transitionResult.error}`);
      }
    }

    // Check for auto-progress after deed finalization (APPROVED -> COMPLETED)
    const autoTransition = await checkAutoProgressAfterDeedFinalization(
      applicationId,
      stageTransition ? stageTransition.toStage.id : result.application.currentStageId
    );

    logger.info(`Transfer deed finalized for application ${applicationId} by user ${userId}. Hash: ${result.transferDeed.hashSha256}`);

    return {
      transferDeed: result.transferDeed,
      stageTransition: stageTransition || undefined,
      autoTransition,
      ownershipTransferred: true
    };
  } catch (error) {
    logger.error('Error finalizing deed:', error);
    throw error;
  }
};

const checkAutoProgressAfterDeedFinalization = async (
  applicationId: string,
  currentStageId: string
): Promise<DeedResult['autoTransition']> => {
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

      if (!validateGuardContext(guardContext)) {
        return undefined;
      }

      const guardResult = await executeGuard('GUARD_DEED_FINALIZED', guardContext);

      if (!guardResult.canTransition) {
        logger.warn(`Auto-progress blocked by guard GUARD_DEED_FINALIZED: ${guardResult.reason}`);
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

      logger.info(`Auto-transitioned application ${applicationId} from ${currentStage.code} to ${nextStage.code}`);

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
  } catch (error) {
    logger.error('Error checking auto-progress after deed finalization:', error);
    return undefined;
  }
};

export const getTransferDeed = async (applicationId: string) => {
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

export const updateDeedDraft = async (
  applicationId: string,
  witness1Id: string | null,
  witness2Id: string | null,
  deedContent: string | null,
  userId: string
): Promise<DeedResult> => {
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

    logger.info(`Transfer deed draft updated for application ${applicationId} by user ${userId}`);

    return {
      transferDeed: result.transferDeed
    };
  } catch (error) {
    logger.error('Error updating deed draft:', error);
    throw error;
  }
};
