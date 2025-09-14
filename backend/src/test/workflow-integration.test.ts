import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { executeGuard, validateGuardContext, getAvailableGuards } from '../guards/workflowGuards';

const prisma = new PrismaClient();

describe('Workflow Integration Tests', () => {
  let applicationId: string;
  let personId: string;
  let plotId: string;
  let sellerId: string;
  let buyerId: string;

  beforeAll(async () => {
    await prisma.$connect();
    
    // Get test data
    const person = await prisma.person.findFirst();
    const plot = await prisma.plot.findFirst();
    
    if (!person || !plot) {
      throw new Error('Database not seeded. Please run: npx prisma db seed');
    }
    
    personId = person.id;
    plotId = plot.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up any existing test applications
    await prisma.application.deleteMany({
      where: {
        OR: [
          { sellerId: personId },
          { buyerId: personId }
        ]
      }
    });
  });

  describe('Complete Workflow Simulation', () => {
    it('should create application and simulate complete workflow', async () => {
      // Step 1: Create Application
      const application = await prisma.application.create({
        data: {
          sellerId: personId,
          buyerId: personId,
          plotId: plotId,
          applicationNumber: `APP-${Date.now()}`,
          status: 'ACTIVE',
          currentStageId: (await prisma.wfStage.findFirst({ where: { code: 'SUBMITTED' } }))!.id
        },
        include: {
          currentStage: true,
          seller: true,
          buyer: true,
          plot: true
        }
      });

      applicationId = application.id;
      sellerId = personId;
      buyerId = personId;

      expect(application).toBeDefined();
      expect(application.currentStage.code).toBe('SUBMITTED');
    });

    it('should test GUARD_INTAKE_COMPLETE - initially fail', async () => {
      const context = {
        applicationId,
        userId: 'test-user-id',
        userRole: 'OWO',
        fromStageId: (await prisma.wfStage.findFirst({ where: { code: 'SUBMITTED' } }))!.id,
        toStageId: (await prisma.wfStage.findFirst({ where: { code: 'UNDER_SCRUTINY' } }))!.id
      };

      const result = await executeGuard('GUARD_INTAKE_COMPLETE', context);
      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('Missing required documents');
    });

    it('should add required attachments and pass GUARD_INTAKE_COMPLETE', async () => {
      const requiredDocTypes = [
        'AllotmentLetter',
        'PrevTransferDeed', 
        'CNIC_Seller',
        'CNIC_Buyer',
        'UtilityBill_Latest',
        'Photo_Seller',
        'Photo_Buyer'
      ];

      // Create attachments
      for (const docType of requiredDocTypes) {
        await prisma.attachment.create({
          data: {
            applicationId,
            docType,
            fileName: `${docType.toLowerCase()}.pdf`,
            originalName: `${docType} Document`,
            fileSize: 1024,
            mimeType: 'application/pdf',
            storageUrl: `http://localhost:9000/test/${docType}.pdf`,
            isOriginalSeen: true
          }
        });
      }

      // Test guard again
      const context = {
        applicationId,
        userId: 'test-user-id',
        userRole: 'OWO',
        fromStageId: (await prisma.wfStage.findFirst({ where: { code: 'SUBMITTED' } }))!.id,
        toStageId: (await prisma.wfStage.findFirst({ where: { code: 'UNDER_SCRUTINY' } }))!.id
      };

      const result = await executeGuard('GUARD_INTAKE_COMPLETE', context);
      expect(result.canTransition).toBe(true);
      expect(result.reason).toContain('All required documents uploaded and verified');
    });

    it('should transition to UNDER_SCRUTINY stage', async () => {
      const underScrutinyStage = await prisma.wfStage.findFirst({
        where: { code: 'UNDER_SCRUTINY' }
      });

      await prisma.application.update({
        where: { id: applicationId },
        data: {
          currentStageId: underScrutinyStage!.id,
          previousStageId: (await prisma.wfStage.findFirst({ where: { code: 'SUBMITTED' } }))!.id
        }
      });

      const updatedApp = await prisma.application.findUnique({
        where: { id: applicationId },
        include: { currentStage: true }
      });

      expect(updatedApp?.currentStage.code).toBe('UNDER_SCRUTINY');
    });

    it('should test GUARD_SCRUTINY_COMPLETE - initially fail', async () => {
      const context = {
        applicationId,
        userId: 'test-user-id',
        userRole: 'OWO',
        fromStageId: (await prisma.wfStage.findFirst({ where: { code: 'UNDER_SCRUTINY' } }))!.id,
        toStageId: (await prisma.wfStage.findFirst({ where: { code: 'BCA_PENDING' } }))!.id
      };

      const result = await executeGuard('GUARD_SCRUTINY_COMPLETE', context);
      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('OWO review not completed');
    });

    it('should create OWO review and pass GUARD_SCRUTINY_COMPLETE', async () => {
      const owoSection = await prisma.wfSection.findFirst({
        where: { code: 'OWO' }
      });

      await prisma.review.create({
        data: {
          applicationId,
          sectionId: owoSection!.id,
          reviewerId: 'test-reviewer-id',
          remarks: 'OWO scrutiny completed - all documents verified',
          status: 'APPROVED'
        }
      });

      const context = {
        applicationId,
        userId: 'test-user-id',
        userRole: 'OWO',
        fromStageId: (await prisma.wfStage.findFirst({ where: { code: 'UNDER_SCRUTINY' } }))!.id,
        toStageId: (await prisma.wfStage.findFirst({ where: { code: 'BCA_PENDING' } }))!.id
      };

      const result = await executeGuard('GUARD_SCRUTINY_COMPLETE', context);
      expect(result.canTransition).toBe(true);
      expect(result.reason).toContain('OWO scrutiny completed');
    });

    it('should create BCA clearance', async () => {
      const bcaSection = await prisma.wfSection.findFirst({
        where: { code: 'BCA' }
      });
      const clearStatus = await prisma.wfStatus.findFirst({
        where: { code: 'CLEAR' }
      });

      await prisma.clearance.create({
        data: {
          applicationId,
          sectionId: bcaSection!.id,
          statusId: clearStatus!.id,
          remarks: 'BCA clearance granted - no objections'
        }
      });

      const context = {
        applicationId,
        userId: 'test-user-id',
        userRole: 'BCA',
        fromStageId: (await prisma.wfStage.findFirst({ where: { code: 'BCA_PENDING' } }))!.id,
        toStageId: (await prisma.wfStage.findFirst({ where: { code: 'BCA_HOUSING_CLEAR' } }))!.id
      };

      const result = await executeGuard('GUARD_BCA_CLEAR', context);
      expect(result.canTransition).toBe(true);
      expect(result.reason).toContain('BCA clearance obtained');
    });

    it('should create Housing clearance', async () => {
      const housingSection = await prisma.wfSection.findFirst({
        where: { code: 'HOUSING' }
      });
      const clearStatus = await prisma.wfStatus.findFirst({
        where: { code: 'CLEAR' }
      });

      await prisma.clearance.create({
        data: {
          applicationId,
          sectionId: housingSection!.id,
          statusId: clearStatus!.id,
          remarks: 'Housing clearance granted - no objections'
        }
      });

      const context = {
        applicationId,
        userId: 'test-user-id',
        userRole: 'HOUSING',
        fromStageId: (await prisma.wfStage.findFirst({ where: { code: 'HOUSING_PENDING' } }))!.id,
        toStageId: (await prisma.wfStage.findFirst({ where: { code: 'BCA_HOUSING_CLEAR' } }))!.id
      };

      const result = await executeGuard('GUARD_HOUSING_CLEAR', context);
      expect(result.canTransition).toBe(true);
      expect(result.reason).toContain('Housing clearance obtained');
    });

    it('should test GUARD_CLEARANCES_COMPLETE', async () => {
      const context = {
        applicationId,
        userId: 'test-user-id',
        userRole: 'ADMIN',
        fromStageId: (await prisma.wfStage.findFirst({ where: { code: 'BCA_HOUSING_CLEAR' } }))!.id,
        toStageId: (await prisma.wfStage.findFirst({ where: { code: 'ACCOUNTS_PENDING' } }))!.id
      };

      const result = await executeGuard('GUARD_CLEARANCES_COMPLETE', context);
      expect(result.canTransition).toBe(true);
      expect(result.reason).toContain('Both BCA and Housing clearances obtained');
    });

    it('should create accounts breakdown', async () => {
      await prisma.accountsBreakdown.create({
        data: {
          applicationId,
          totalAmount: 50000,
          paidAmount: 0,
          remainingAmount: 50000,
          paymentVerified: false,
          challanUrl: 'http://localhost:9000/test/challan.pdf'
        }
      });

      const context = {
        applicationId,
        userId: 'test-user-id',
        userRole: 'ACCOUNTS',
        fromStageId: (await prisma.wfStage.findFirst({ where: { code: 'ACCOUNTS_PENDING' } }))!.id,
        toStageId: (await prisma.wfStage.findFirst({ where: { code: 'PAYMENT_PENDING' } }))!.id
      };

      const result = await executeGuard('GUARD_ACCOUNTS_CALCULATED', context);
      expect(result.canTransition).toBe(true);
      expect(result.reason).toContain('Accounts breakdown calculated');
    });

    it('should verify payment and test GUARD_PAYMENT_VERIFIED', async () => {
      await prisma.accountsBreakdown.update({
        where: { applicationId },
        data: {
          paidAmount: 50000,
          paymentVerified: true,
          challanUrl: 'http://localhost:9000/test/paid-challan.pdf'
        }
      });

      const context = {
        applicationId,
        userId: 'test-user-id',
        userRole: 'ACCOUNTS',
        fromStageId: (await prisma.wfStage.findFirst({ where: { code: 'PAYMENT_PENDING' } }))!.id,
        toStageId: (await prisma.wfStage.findFirst({ where: { code: 'READY_FOR_APPROVAL' } }))!.id
      };

      const result = await executeGuard('GUARD_PAYMENT_VERIFIED', context);
      expect(result.canTransition).toBe(true);
      expect(result.reason).toContain('Payment verified');
    });

    it('should create approver review and test GUARD_APPROVAL_COMPLETE', async () => {
      const approverSection = await prisma.wfSection.findFirst({
        where: { code: 'APPROVER' }
      });

      await prisma.review.create({
        data: {
          applicationId,
          sectionId: approverSection!.id,
          reviewerId: 'test-approver-id',
          remarks: 'Final approval granted - all requirements met',
          status: 'APPROVED'
        }
      });

      const context = {
        applicationId,
        userId: 'test-user-id',
        userRole: 'APPROVER',
        fromStageId: (await prisma.wfStage.findFirst({ where: { code: 'READY_FOR_APPROVAL' } }))!.id,
        toStageId: (await prisma.wfStage.findFirst({ where: { code: 'APPROVED' } }))!.id
      };

      const result = await executeGuard('GUARD_APPROVAL_COMPLETE', context);
      expect(result.canTransition).toBe(true);
      expect(result.reason).toContain('Approval completed');
    });

    it('should create and finalize transfer deed', async () => {
      const witness1 = await prisma.person.findFirst({
        where: { cnic: '12345-1234567-2' }
      });
      const witness2 = await prisma.person.findFirst({
        where: { cnic: '12345-1234567-3' }
      });

      const transferDeed = await prisma.transferDeed.create({
        data: {
          applicationId,
          witness1Id: witness1!.id,
          witness2Id: witness2!.id,
          deedContent: 'This is a test transfer deed content...',
          isFinalized: false
        }
      });

      // Finalize the deed
      await prisma.transferDeed.update({
        where: { id: transferDeed.id },
        data: {
          isFinalized: true,
          hashSha256: 'test-hash-sha256',
          finalizedAt: new Date()
        }
      });

      const context = {
        applicationId,
        userId: 'test-user-id',
        userRole: 'ADMIN',
        fromStageId: (await prisma.wfStage.findFirst({ where: { code: 'APPROVED' } }))!.id,
        toStageId: (await prisma.wfStage.findFirst({ where: { code: 'COMPLETED' } }))!.id
      };

      const result = await executeGuard('GUARD_DEED_FINALIZED', context);
      expect(result.canTransition).toBe(true);
      expect(result.reason).toContain('Transfer deed finalized');
    });

    it('should verify complete workflow state', async () => {
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          currentStage: true,
          attachments: true,
          clearances: {
            include: {
              section: true,
              status: true
            }
          },
          reviews: {
            include: {
              section: true
            }
          },
          accountsBreakdown: true,
          transferDeed: true
        }
      });

      expect(application).toBeDefined();
      expect(application?.attachments).toHaveLength(7); // All required documents
      expect(application?.clearances).toHaveLength(2); // BCA and Housing
      expect(application?.reviews).toHaveLength(2); // OWO and Approver
      expect(application?.accountsBreakdown).toBeDefined();
      expect(application?.accountsBreakdown?.paymentVerified).toBe(true);
      expect(application?.transferDeed).toBeDefined();
      expect(application?.transferDeed?.isFinalized).toBe(true);
    });

    it('should test all guards with complete application', async () => {
      const guards = [
        'GUARD_INTAKE_COMPLETE',
        'GUARD_SCRUTINY_COMPLETE', 
        'GUARD_BCA_CLEAR',
        'GUARD_HOUSING_CLEAR',
        'GUARD_CLEARANCES_COMPLETE',
        'GUARD_ACCOUNTS_CALCULATED',
        'GUARD_PAYMENT_VERIFIED',
        'GUARD_APPROVAL_COMPLETE',
        'GUARD_DEED_FINALIZED'
      ];

      for (const guardName of guards) {
        const context = {
          applicationId,
          userId: 'test-user-id',
          userRole: 'ADMIN',
          fromStageId: (await prisma.wfStage.findFirst({ where: { code: 'SUBMITTED' } }))!.id,
          toStageId: (await prisma.wfStage.findFirst({ where: { code: 'COMPLETED' } }))!.id
        };

        const result = await executeGuard(guardName, context);
        expect(result.canTransition).toBe(true);
        expect(result.reason).toBeDefined();
      }
    });

    it('should clean up test data', async () => {
      // Delete in correct order to avoid foreign key constraints
      await prisma.attachment.deleteMany({
        where: { applicationId }
      });
      
      await prisma.clearance.deleteMany({
        where: { applicationId }
      });
      
      await prisma.review.deleteMany({
        where: { applicationId }
      });
      
      await prisma.accountsBreakdown.deleteMany({
        where: { applicationId }
      });
      
      await prisma.transferDeed.deleteMany({
        where: { applicationId }
      });
      
      await prisma.application.delete({
        where: { id: applicationId }
      });

      // Verify cleanup
      const application = await prisma.application.findUnique({
        where: { id: applicationId }
      });
      expect(application).toBeNull();
    });
  });

  describe('Guard System Integration', () => {
    it('should have all expected guards available', () => {
      const availableGuards = getAvailableGuards();
      const expectedGuards = [
        'GUARD_INTAKE_COMPLETE',
        'GUARD_SCRUTINY_COMPLETE',
        'GUARD_BCA_CLEAR',
        'GUARD_BCA_OBJECTION',
        'GUARD_HOUSING_CLEAR',
        'GUARD_HOUSING_OBJECTION',
        'GUARD_CLEARANCES_COMPLETE',
        'GUARD_BCA_RESOLVED',
        'GUARD_HOUSING_RESOLVED',
        'GUARD_ACCOUNTS_CALCULATED',
        'GUARD_PAYMENT_VERIFIED',
        'GUARD_APPROVAL_COMPLETE',
        'GUARD_APPROVAL_REJECTED',
        'GUARD_DEED_FINALIZED'
      ];

      expectedGuards.forEach(guard => {
        expect(availableGuards).toContain(guard);
      });
    });

    it('should validate guard context correctly', () => {
      const validContext = {
        applicationId: 'test-app-id',
        userId: 'test-user-id',
        userRole: 'OWO',
        fromStageId: 'from-stage-id',
        toStageId: 'to-stage-id'
      };

      expect(validateGuardContext(validContext)).toBe(true);

      // Test invalid contexts
      expect(validateGuardContext({ ...validContext, applicationId: '' })).toBe(false);
      expect(validateGuardContext({ ...validContext, userId: '' })).toBe(false);
      expect(validateGuardContext({ ...validContext, userRole: '' })).toBe(false);
      expect(validateGuardContext({ ...validContext, fromStageId: '' })).toBe(false);
      expect(validateGuardContext({ ...validContext, toStageId: '' })).toBe(false);
    });
  });
});
