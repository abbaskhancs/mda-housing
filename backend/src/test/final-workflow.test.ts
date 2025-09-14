import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { executeGuard, validateGuardContext, getAvailableGuards } from '../guards/workflowGuards';

const prisma = new PrismaClient();

describe('Final Workflow Integration Test', () => {
  let applicationId: string;
  let personId: string;
  let plotId: string;

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
    // Clean up test data
    if (applicationId) {
      await prisma.attachment.deleteMany({ where: { applicationId } });
      await prisma.clearance.deleteMany({ where: { applicationId } });
      await prisma.review.deleteMany({ where: { applicationId } });
      await prisma.accountsBreakdown.deleteMany({ where: { applicationId } });
      await prisma.transferDeed.deleteMany({ where: { applicationId } });
      await prisma.application.delete({ where: { id: applicationId } });
    }
    await prisma.$disconnect();
  });

  describe('Guard Unit Tests Pass', () => {
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

  describe('Sample Flow Execution - Core Guards', () => {
    it('should create application and test core workflow guards', async () => {
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

      expect(application).toBeDefined();
      expect(application.currentStage.code).toBe('SUBMITTED');

      // Step 2: Test GUARD_INTAKE_COMPLETE - should fail initially
      const intakeContext = {
        applicationId,
        userId: 'test-user-id',
        userRole: 'OWO',
        fromStageId: (await prisma.wfStage.findFirst({ where: { code: 'SUBMITTED' } }))!.id,
        toStageId: (await prisma.wfStage.findFirst({ where: { code: 'UNDER_SCRUTINY' } }))!.id
      };

      const intakeResult = await executeGuard('GUARD_INTAKE_COMPLETE', intakeContext);
      expect(intakeResult.canTransition).toBe(false);
      expect(intakeResult.reason).toContain('Missing required documents');

      // Step 3: Add required attachments
      const requiredDocTypes = [
        'AllotmentLetter',
        'PrevTransferDeed', 
        'CNIC_Seller',
        'CNIC_Buyer',
        'UtilityBill_Latest',
        'Photo_Seller',
        'Photo_Buyer'
      ];

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

      // Step 4: Test GUARD_INTAKE_COMPLETE - should now pass
      const intakeResult2 = await executeGuard('GUARD_INTAKE_COMPLETE', intakeContext);
      expect(intakeResult2.canTransition).toBe(true);
      expect(intakeResult2.reason).toContain('All required documents uploaded and verified');

      // Step 5: Create BCA clearance
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

      // Step 6: Test GUARD_BCA_CLEAR
      const bcaContext = {
        applicationId,
        userId: 'test-user-id',
        userRole: 'BCA',
        fromStageId: (await prisma.wfStage.findFirst({ where: { code: 'BCA_PENDING' } }))!.id,
        toStageId: (await prisma.wfStage.findFirst({ where: { code: 'BCA_HOUSING_CLEAR' } }))!.id
      };

      const bcaResult = await executeGuard('GUARD_BCA_CLEAR', bcaContext);
      expect(bcaResult.canTransition).toBe(true);
      expect(bcaResult.reason).toContain('BCA clearance obtained');

      // Step 7: Create Housing clearance
      const housingSection = await prisma.wfSection.findFirst({
        where: { code: 'HOUSING' }
      });

      await prisma.clearance.create({
        data: {
          applicationId,
          sectionId: housingSection!.id,
          statusId: clearStatus!.id,
          remarks: 'Housing clearance granted - no objections'
        }
      });

      // Step 8: Test GUARD_HOUSING_CLEAR
      const housingContext = {
        applicationId,
        userId: 'test-user-id',
        userRole: 'HOUSING',
        fromStageId: (await prisma.wfStage.findFirst({ where: { code: 'HOUSING_PENDING' } }))!.id,
        toStageId: (await prisma.wfStage.findFirst({ where: { code: 'BCA_HOUSING_CLEAR' } }))!.id
      };

      const housingResult = await executeGuard('GUARD_HOUSING_CLEAR', housingContext);
      expect(housingResult.canTransition).toBe(true);
      expect(housingResult.reason).toContain('Housing clearance obtained');

      // Step 9: Test GUARD_CLEARANCES_COMPLETE
      const clearancesContext = {
        applicationId,
        userId: 'test-user-id',
        userRole: 'ADMIN',
        fromStageId: (await prisma.wfStage.findFirst({ where: { code: 'BCA_HOUSING_CLEAR' } }))!.id,
        toStageId: (await prisma.wfStage.findFirst({ where: { code: 'ACCOUNTS_PENDING' } }))!.id
      };

      const clearancesResult = await executeGuard('GUARD_CLEARANCES_COMPLETE', clearancesContext);
      expect(clearancesResult.canTransition).toBe(true);
      expect(clearancesResult.reason).toContain('Both BCA and Housing clearances obtained');

      // Step 10: Create accounts breakdown
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

      // Step 11: Test GUARD_ACCOUNTS_CALCULATED
      const accountsContext = {
        applicationId,
        userId: 'test-user-id',
        userRole: 'ACCOUNTS',
        fromStageId: (await prisma.wfStage.findFirst({ where: { code: 'ACCOUNTS_PENDING' } }))!.id,
        toStageId: (await prisma.wfStage.findFirst({ where: { code: 'PAYMENT_PENDING' } }))!.id
      };

      const accountsResult = await executeGuard('GUARD_ACCOUNTS_CALCULATED', accountsContext);
      expect(accountsResult.canTransition).toBe(true);
      expect(accountsResult.reason).toContain('Accounts breakdown calculated');

      // Step 12: Verify payment
      await prisma.accountsBreakdown.update({
        where: { applicationId },
        data: {
          paidAmount: 50000,
          remainingAmount: 0,
          paymentVerified: true,
          challanUrl: 'http://localhost:9000/test/paid-challan.pdf'
        }
      });

      // Step 13: Test GUARD_PAYMENT_VERIFIED
      const paymentContext = {
        applicationId,
        userId: 'test-user-id',
        userRole: 'ACCOUNTS',
        fromStageId: (await prisma.wfStage.findFirst({ where: { code: 'PAYMENT_PENDING' } }))!.id,
        toStageId: (await prisma.wfStage.findFirst({ where: { code: 'READY_FOR_APPROVAL' } }))!.id
      };

      const paymentResult = await executeGuard('GUARD_PAYMENT_VERIFIED', paymentContext);
      expect(paymentResult.canTransition).toBe(true);
      expect(paymentResult.reason).toContain('Payment verified');

      // Step 14: Create and finalize transfer deed
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

      // Step 15: Test GUARD_DEED_FINALIZED
      const deedContext = {
        applicationId,
        userId: 'test-user-id',
        userRole: 'ADMIN',
        fromStageId: (await prisma.wfStage.findFirst({ where: { code: 'APPROVED' } }))!.id,
        toStageId: (await prisma.wfStage.findFirst({ where: { code: 'COMPLETED' } }))!.id
      };

      const deedResult = await executeGuard('GUARD_DEED_FINALIZED', deedContext);
      expect(deedResult.canTransition).toBe(true);
      expect(deedResult.reason).toContain('Transfer deed finalized');

      // Step 16: Verify complete workflow state
      const finalApplication = await prisma.application.findUnique({
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
          accountsBreakdown: true,
          transferDeed: true
        }
      });

      expect(finalApplication).toBeDefined();
      expect(finalApplication?.attachments).toHaveLength(7); // All required documents
      expect(finalApplication?.clearances).toHaveLength(2); // BCA and Housing
      expect(finalApplication?.accountsBreakdown).toBeDefined();
      expect(finalApplication?.accountsBreakdown?.paymentVerified).toBe(true);
      expect(finalApplication?.transferDeed).toBeDefined();
      expect(finalApplication?.transferDeed?.isFinalized).toBe(true);
    });

    it('should test core guards with complete application', async () => {
      const coreGuards = [
        'GUARD_INTAKE_COMPLETE',
        'GUARD_BCA_CLEAR',
        'GUARD_HOUSING_CLEAR',
        'GUARD_CLEARANCES_COMPLETE',
        'GUARD_ACCOUNTS_CALCULATED',
        'GUARD_PAYMENT_VERIFIED',
        'GUARD_DEED_FINALIZED'
      ];

      for (const guardName of coreGuards) {
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
  });
});
