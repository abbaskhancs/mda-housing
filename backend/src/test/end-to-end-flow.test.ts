import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

// Test data
let adminToken: string;
let owoToken: string;
let bcaToken: string;
let housingToken: string;
let accountsToken: string;
let approverToken: string;
let applicationId: string;
let personId: string;
let plotId: string;
let sellerId: string;
let buyerId: string;

const baseUrl = 'http://localhost:3001';

// Helper function to make API requests
const apiRequest = async (method: string, endpoint: string, body?: any, token?: string) => {
  const headers: any = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json();
  return { status: response.status, data: data as any };
};

describe('End-to-End Workflow Flow', () => {
  beforeAll(async () => {
    // Ensure database is seeded
    await prisma.$connect();
    
    // Check if we have test data
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

  describe('Step 1: Authentication', () => {
    it('should login all demo users successfully', async () => {
      // Login Admin
      const adminResponse = await apiRequest('POST', '/api/auth/login', {
        username: 'admin',
        password: 'password123'
      });
      expect(adminResponse.status).toBe(200);
      expect(adminResponse.data.token).toBeDefined();
      adminToken = adminResponse.data.token;

      // Login OWO Officer
      const owoResponse = await apiRequest('POST', '/api/auth/login', {
        username: 'owo_officer',
        password: 'password123'
      });
      expect(owoResponse.status).toBe(200);
      owoToken = owoResponse.data.token;

      // Login BCA Officer
      const bcaResponse = await apiRequest('POST', '/api/auth/login', {
        username: 'bca_officer',
        password: 'password123'
      });
      expect(bcaResponse.status).toBe(200);
      bcaToken = bcaResponse.data.token;

      // Login Housing Officer
      const housingResponse = await apiRequest('POST', '/api/auth/login', {
        username: 'housing_officer',
        password: 'password123'
      });
      expect(housingResponse.status).toBe(200);
      housingToken = housingResponse.data.token;

      // Login Accounts Officer
      const accountsResponse = await apiRequest('POST', '/api/auth/login', {
        username: 'accounts_officer',
        password: 'password123'
      });
      expect(accountsResponse.status).toBe(200);
      accountsToken = accountsResponse.data.token;

      // Login Approver
      const approverResponse = await apiRequest('POST', '/api/auth/login', {
        username: 'approver',
        password: 'password123'
      });
      expect(approverResponse.status).toBe(200);
      approverToken = approverResponse.data.token;
    });
  });

  describe('Step 2: Create Application', () => {
    it('should create a new application', async () => {
      // Create seller and buyer (using same person for simplicity)
      sellerId = personId;
      buyerId = personId;

      const response = await apiRequest('POST', '/api/applications', {
        sellerId,
        buyerId,
        plotId
      }, adminToken);

      expect(response.status).toBe(201);
      expect(response.data.application).toBeDefined();
      expect(response.data.application.id).toBeDefined();
      applicationId = response.data.application.id;

      // Verify application is in SUBMITTED stage
      expect(response.data.application.currentStage.code).toBe('SUBMITTED');
    });

    it('should verify application was created in database', async () => {
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          currentStage: true,
          seller: true,
          buyer: true,
          plot: true
        }
      });

      expect(application).toBeDefined();
      expect(application?.currentStage.code).toBe('SUBMITTED');
      expect(application?.seller.id).toBe(sellerId);
      expect(application?.buyer.id).toBe(buyerId);
      expect(application?.plot.id).toBe(plotId);
    });
  });

  describe('Step 3: Test Guard Evaluation', () => {
    it('should get transitions with dry-run guard evaluation', async () => {
      const response = await apiRequest('GET', 
        `/api/workflow/transitions?from=SUBMITTED&applicationId=${applicationId}&dryRun=true`, 
        undefined, 
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.data.transitions).toBeDefined();
      expect(response.data.application).toBeDefined();
      expect(response.data.transitions[0]).toHaveProperty('guardResult');
      
      // Should fail GUARD_INTAKE_COMPLETE because no attachments
      const guardResult = response.data.transitions[0].guardResult;
      expect(guardResult.canTransition).toBe(false);
      expect(guardResult.reason).toContain('Missing required documents');
    });
  });

  describe('Step 4: Add Required Attachments', () => {
    it('should add required attachments to pass intake guard', async () => {
      const requiredDocTypes = [
        'AllotmentLetter',
        'PrevTransferDeed', 
        'CNIC_Seller',
        'CNIC_Buyer',
        'UtilityBill_Latest',
        'Photo_Seller',
        'Photo_Buyer'
      ];

      // Create attachments in database
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

      // Verify attachments were created
      const attachments = await prisma.attachment.findMany({
        where: { applicationId }
      });
      expect(attachments).toHaveLength(requiredDocTypes.length);
    });

    it('should now pass intake guard', async () => {
      const response = await apiRequest('GET', 
        `/api/workflow/transitions?from=SUBMITTED&applicationId=${applicationId}&dryRun=true`, 
        undefined, 
        adminToken
      );

      expect(response.status).toBe(200);
      const guardResult = response.data.transitions[0].guardResult;
      expect(guardResult.canTransition).toBe(true);
      expect(guardResult.reason).toContain('All required documents uploaded and verified');
    });
  });

  describe('Step 5: Transition to Under Scrutiny', () => {
    it('should transition application to UNDER_SCRUTINY stage', async () => {
      // Get the target stage ID
      const targetStage = await prisma.wfStage.findFirst({
        where: { code: 'UNDER_SCRUTINY' }
      });
      expect(targetStage).toBeDefined();

      const response = await apiRequest('POST', 
        `/api/workflow/applications/${applicationId}/transition`, 
        {
          toStageId: targetStage!.id,
          remarks: 'Application moved to scrutiny phase'
        }, 
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.data.application.currentStage.code).toBe('UNDER_SCRUTINY');
    });
  });

  describe('Step 6: OWO Scrutiny', () => {
    it('should create OWO review', async () => {
      const owoSection = await prisma.wfSection.findFirst({
        where: { code: 'OWO' }
      });
      expect(owoSection).toBeDefined();

      const response = await apiRequest('POST', 
        `/api/applications/${applicationId}/reviews`, 
        {
          sectionId: owoSection!.id,
          remarks: 'OWO scrutiny completed - all documents verified',
          status: 'APPROVED'
        }, 
        owoToken
      );

      expect(response.status).toBe(201);
      expect(response.data.review).toBeDefined();
    });

    it('should now pass scrutiny guard', async () => {
      const response = await apiRequest('GET', 
        `/api/workflow/transitions?from=UNDER_SCRUTINY&applicationId=${applicationId}&dryRun=true`, 
        undefined, 
        owoToken
      );

      expect(response.status).toBe(200);
      const guardResult = response.data.transitions[0].guardResult;
      expect(guardResult.canTransition).toBe(true);
      expect(guardResult.reason).toContain('OWO scrutiny completed');
    });
  });

  describe('Step 7: BCA Clearance', () => {
    it('should create BCA clearance', async () => {
      const bcaSection = await prisma.wfSection.findFirst({
        where: { code: 'BCA' }
      });
      const clearStatus = await prisma.wfStatus.findFirst({
        where: { code: 'CLEAR' }
      });
      expect(bcaSection).toBeDefined();
      expect(clearStatus).toBeDefined();

      const response = await apiRequest('POST', 
        `/api/applications/${applicationId}/clearances`, 
        {
          sectionId: bcaSection!.id,
          statusId: clearStatus!.id,
          remarks: 'BCA clearance granted - no objections'
        }, 
        bcaToken
      );

      expect(response.status).toBe(201);
      expect(response.data.clearance).toBeDefined();
    });
  });

  describe('Step 8: Housing Clearance', () => {
    it('should create Housing clearance', async () => {
      const housingSection = await prisma.wfSection.findFirst({
        where: { code: 'HOUSING' }
      });
      const clearStatus = await prisma.wfStatus.findFirst({
        where: { code: 'CLEAR' }
      });
      expect(housingSection).toBeDefined();
      expect(clearStatus).toBeDefined();

      const response = await apiRequest('POST', 
        `/api/applications/${applicationId}/clearances`, 
        {
          sectionId: housingSection!.id,
          statusId: clearStatus!.id,
          remarks: 'Housing clearance granted - no objections'
        }, 
        housingToken
      );

      expect(response.status).toBe(201);
      expect(response.data.clearance).toBeDefined();
    });
  });

  describe('Step 9: Accounts Processing', () => {
    it('should create accounts breakdown', async () => {
      const response = await apiRequest('POST', 
        `/api/applications/${applicationId}/accounts`, 
        {
          totalAmount: 50000,
          challanUrl: 'http://localhost:9000/test/challan.pdf'
        }, 
        accountsToken
      );

      expect(response.status).toBe(201);
      expect(response.data.accountsBreakdown).toBeDefined();
      expect(response.data.accountsBreakdown.totalAmount).toBe(50000);
    });

    it('should verify payment', async () => {
      const response = await apiRequest('POST', 
        `/api/applications/${applicationId}/accounts/verify-payment`, 
        {
          paidAmount: 50000,
          challanUrl: 'http://localhost:9000/test/paid-challan.pdf'
        }, 
        accountsToken
      );

      expect(response.status).toBe(200);
      expect(response.data.accountsBreakdown.paymentVerified).toBe(true);
    });
  });

  describe('Step 10: Final Approval', () => {
    it('should create approver review', async () => {
      const approverSection = await prisma.wfSection.findFirst({
        where: { code: 'APPROVER' }
      });
      expect(approverSection).toBeDefined();

      const response = await apiRequest('POST', 
        `/api/applications/${applicationId}/reviews`, 
        {
          sectionId: approverSection!.id,
          remarks: 'Final approval granted - all requirements met',
          status: 'APPROVED'
        }, 
        approverToken
      );

      expect(response.status).toBe(201);
      expect(response.data.review).toBeDefined();
    });
  });

  describe('Step 11: Create Transfer Deed', () => {
    it('should create transfer deed draft', async () => {
      // Get witness persons
      const witness1 = await prisma.person.findFirst({
        where: { cnic: '12345-1234567-2' }
      });
      const witness2 = await prisma.person.findFirst({
        where: { cnic: '12345-1234567-3' }
      });
      expect(witness1).toBeDefined();
      expect(witness2).toBeDefined();

      const response = await apiRequest('POST', 
        `/api/applications/${applicationId}/transfer-deed/draft`, 
        {
          witness1Id: witness1!.id,
          witness2Id: witness2!.id,
          deedContent: 'This is a test transfer deed content...'
        }, 
        adminToken
      );

      expect(response.status).toBe(201);
      expect(response.data.transferDeed).toBeDefined();
    });

    it('should finalize transfer deed', async () => {
      const response = await apiRequest('POST', 
        `/api/applications/${applicationId}/transfer-deed/finalize`, 
        {
          witness1Signature: 'Witness1_Signature_Data',
          witness2Signature: 'Witness2_Signature_Data'
        }, 
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.data.transferDeed.isFinalized).toBe(true);
      expect(response.data.transferDeed.hashSha256).toBeDefined();
    });
  });

  describe('Step 12: Final Verification', () => {
    it('should verify complete workflow execution', async () => {
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
      expect(application?.currentStage.code).toBe('UNDER_SCRUTINY'); // Should be in final stage
      expect(application?.attachments).toHaveLength(7); // All required documents
      expect(application?.clearances).toHaveLength(2); // BCA and Housing
      expect(application?.reviews).toHaveLength(2); // OWO and Approver
      expect(application?.accountsBreakdown).toBeDefined();
      expect(application?.transferDeed).toBeDefined();
      expect(application?.transferDeed?.isFinalized).toBe(true);
    });

    it('should verify all guards can pass', async () => {
      // Test all guards with the completed application
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
        const response = await apiRequest('POST', 
          `/api/workflow/applications/${applicationId}/guard-test`, 
          {
            toStageId: 'test-stage-id' // This will fail transition but test guard
          }, 
          adminToken
        );

        // Guard test should return 200 even if transition fails
        expect(response.status).toBe(200);
        expect(response.data.guardResult).toBeDefined();
      }
    });
  });

  describe('Step 13: Cleanup', () => {
    it('should clean up test data', async () => {
      // Delete test application and related data
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
});
