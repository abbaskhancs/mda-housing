import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

// Mock Prisma client before importing guards
const mockApplicationFindUnique = jest.fn() as jest.MockedFunction<any>;
const mockPrisma = {
  application: {
    findUnique: mockApplicationFindUnique,
  },
} as any;

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
}));

import {
  GUARDS,
  executeGuard,
  getAvailableGuards,
  validateGuardContext,
  GuardContext,
  GuardResult
} from '../guards/workflowGuards';

describe('Workflow Guards', () => {
  let mockContext: GuardContext;

  beforeEach(() => {
    mockContext = {
      applicationId: 'test-app-id',
      userId: 'test-user-id',
      userRole: 'OWO',
      fromStageId: 'from-stage-id',
      toStageId: 'to-stage-id'
    };

    // Reset all mocks
    jest.clearAllMocks();
    mockApplicationFindUnique.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Guard Context Validation', () => {
    it('should validate complete guard context', () => {
      expect(validateGuardContext(mockContext)).toBe(true);
    });

    it('should reject incomplete guard context', () => {
      expect(validateGuardContext({ ...mockContext, applicationId: '' })).toBe(false);
      expect(validateGuardContext({ ...mockContext, userId: '' })).toBe(false);
      expect(validateGuardContext({ ...mockContext, userRole: '' })).toBe(false);
      expect(validateGuardContext({ ...mockContext, fromStageId: '' })).toBe(false);
      expect(validateGuardContext({ ...mockContext, toStageId: '' })).toBe(false);
    });
  });

  describe('Guard Registry', () => {
    it('should have all expected guards', () => {
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

      const availableGuards = getAvailableGuards();
      expectedGuards.forEach(guard => {
        expect(availableGuards).toContain(guard);
        expect(GUARDS[guard]).toBeDefined();
      });
    });

    it('should execute guard by name', async () => {
      const result = await executeGuard('GUARD_INTAKE_COMPLETE', mockContext);
      expect(result).toHaveProperty('canTransition');
      expect(result).toHaveProperty('reason');
    });

    it('should handle unknown guard', async () => {
      const result = await executeGuard('UNKNOWN_GUARD', mockContext);
      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('Unknown guard');
    });
  });

  describe('GUARD_INTAKE_COMPLETE', () => {
    it('should pass when all required documents are uploaded and seen', async () => {
      const mockApplication = {
        id: 'test-app-id',
        attachments: [
          { docType: 'AllotmentLetter', isOriginalSeen: true },
          { docType: 'PrevTransferDeed', isOriginalSeen: true },
          { docType: 'CNIC_Seller', isOriginalSeen: true },
          { docType: 'CNIC_Buyer', isOriginalSeen: true },
          { docType: 'UtilityBill_Latest', isOriginalSeen: true },
          { docType: 'Photo_Seller', isOriginalSeen: true },
          { docType: 'Photo_Buyer', isOriginalSeen: true }
        ]
      };

      mockApplicationFindUnique.mockResolvedValue(mockApplication as any);

      const result = await GUARDS.GUARD_INTAKE_COMPLETE(mockContext);

      expect(result.canTransition).toBe(true);
      expect(result.reason).toContain('All required documents uploaded and verified');
    });

    it('should fail when required documents are missing', async () => {
      const mockApplication = {
        id: 'test-app-id',
        attachments: [
          { docType: 'AllotmentLetter', isOriginalSeen: true },
          { docType: 'CNIC_Seller', isOriginalSeen: true }
        ]
      };

      mockApplicationFindUnique.mockResolvedValue(mockApplication as any);

      const result = await GUARDS.GUARD_INTAKE_COMPLETE(mockContext);

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('Missing required documents');
    });

    it('should fail when documents are not marked as original seen', async () => {
      const mockApplication = {
        id: 'test-app-id',
        attachments: [
          { docType: 'AllotmentLetter', isOriginalSeen: false },
          { docType: 'PrevTransferDeed', isOriginalSeen: true },
          { docType: 'CNIC_Seller', isOriginalSeen: true },
          { docType: 'CNIC_Buyer', isOriginalSeen: true },
          { docType: 'UtilityBill_Latest', isOriginalSeen: true },
          { docType: 'Photo_Seller', isOriginalSeen: true },
          { docType: 'Photo_Buyer', isOriginalSeen: true }
        ]
      };

      mockApplicationFindUnique.mockResolvedValue(mockApplication as any);

      const result = await GUARDS.GUARD_INTAKE_COMPLETE(mockContext);

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('Documents not marked as original seen');
    });

    it('should fail when application not found', async () => {
      mockApplicationFindUnique.mockResolvedValue(null);

      const result = await GUARDS.GUARD_INTAKE_COMPLETE(mockContext);

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('Application not found');
    });
  });

  describe('GUARD_SCRUTINY_COMPLETE', () => {
    it('should pass when OWO has completed review', async () => {
      const mockApplication = {
        id: 'test-app-id',
        reviews: [
          {
            id: 'review-id',
            section: { code: 'OWO' },
            status: 'APPROVED'
          }
        ]
      };

      mockApplicationFindUnique.mockResolvedValue(mockApplication as any);

      const result = await GUARDS.GUARD_SCRUTINY_COMPLETE(mockContext);

      expect(result.canTransition).toBe(true);
      expect(result.reason).toContain('OWO scrutiny completed');
    });

    it('should fail when user is not OWO', async () => {
      const result = await GUARDS.GUARD_SCRUTINY_COMPLETE({
        ...mockContext,
        userRole: 'BCA'
      });

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('Only OWO can complete scrutiny');
    });

    it('should fail when OWO review not completed', async () => {
      const mockApplication = {
        id: 'test-app-id',
        reviews: []
      };

      mockApplicationFindUnique.mockResolvedValue(mockApplication as any);

      const result = await GUARDS.GUARD_SCRUTINY_COMPLETE(mockContext);

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('OWO review not completed');
    });
  });

  describe('GUARD_BCA_CLEAR', () => {
    it('should pass when BCA clearance is obtained', async () => {
      const mockApplication = {
        id: 'test-app-id',
        clearances: [
          {
            id: 'clearance-id',
            section: { code: 'BCA' },
            status: { code: 'CLEAR' }
          }
        ]
      };

      mockApplicationFindUnique.mockResolvedValue(mockApplication as any);

      const result = await GUARDS.GUARD_BCA_CLEAR(mockContext);

      expect(result.canTransition).toBe(true);
      expect(result.reason).toContain('BCA clearance obtained');
    });

    it('should fail when BCA clearance not obtained', async () => {
      const mockApplication = {
        id: 'test-app-id',
        clearances: []
      };

      mockApplicationFindUnique.mockResolvedValue(mockApplication as any);

      const result = await GUARDS.GUARD_BCA_CLEAR(mockContext);

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('BCA clearance not obtained');
    });
  });

  describe('GUARD_BCA_OBJECTION', () => {
    it('should pass when BCA objection is raised', async () => {
      const mockApplication = {
        id: 'test-app-id',
        clearances: [
          {
            id: 'clearance-id',
            section: { code: 'BCA' },
            status: { code: 'OBJECTION' }
          }
        ]
      };

      mockApplicationFindUnique.mockResolvedValue(mockApplication as any);

      const result = await GUARDS.GUARD_BCA_OBJECTION(mockContext);

      expect(result.canTransition).toBe(true);
      expect(result.reason).toContain('BCA objection raised');
    });

    it('should fail when BCA objection not found', async () => {
      const mockApplication = {
        id: 'test-app-id',
        clearances: []
      };

      mockApplicationFindUnique.mockResolvedValue(mockApplication as any);

      const result = await GUARDS.GUARD_BCA_OBJECTION(mockContext);

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('BCA objection not found');
    });
  });

  describe('GUARD_HOUSING_CLEAR', () => {
    it('should pass when Housing clearance is obtained', async () => {
      const mockApplication = {
        id: 'test-app-id',
        clearances: [
          {
            id: 'clearance-id',
            section: { code: 'HOUSING' },
            status: { code: 'CLEAR' }
          }
        ]
      };

      mockApplicationFindUnique.mockResolvedValue(mockApplication as any);

      const result = await GUARDS.GUARD_HOUSING_CLEAR(mockContext);

      expect(result.canTransition).toBe(true);
      expect(result.reason).toContain('Housing clearance obtained');
    });

    it('should fail when Housing clearance not obtained', async () => {
      const mockApplication = {
        id: 'test-app-id',
        clearances: []
      };

      mockApplicationFindUnique.mockResolvedValue(mockApplication as any);

      const result = await GUARDS.GUARD_HOUSING_CLEAR(mockContext);

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('Housing clearance not obtained');
    });
  });

  describe('GUARD_CLEARANCES_COMPLETE', () => {
    it('should pass when both BCA and Housing clearances are obtained', async () => {
      const mockApplication = {
        id: 'test-app-id',
        clearances: [
          {
            id: 'bca-clearance-id',
            section: { code: 'BCA' },
            status: { code: 'CLEAR' }
          },
          {
            id: 'housing-clearance-id',
            section: { code: 'HOUSING' },
            status: { code: 'CLEAR' }
          }
        ]
      };

      mockApplicationFindUnique.mockResolvedValue(mockApplication as any);

      const result = await GUARDS.GUARD_CLEARANCES_COMPLETE(mockContext);

      expect(result.canTransition).toBe(true);
      expect(result.reason).toContain('Both BCA and Housing clearances obtained');
    });

    it('should fail when BCA clearance missing', async () => {
      const mockApplication = {
        id: 'test-app-id',
        clearances: [
          {
            id: 'housing-clearance-id',
            section: { code: 'HOUSING' },
            status: { code: 'CLEAR' }
          }
        ]
      };

      mockApplicationFindUnique.mockResolvedValue(mockApplication as any);

      const result = await GUARDS.GUARD_CLEARANCES_COMPLETE(mockContext);

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('BCA clearance not obtained');
    });

    it('should fail when Housing clearance missing', async () => {
      const mockApplication = {
        id: 'test-app-id',
        clearances: [
          {
            id: 'bca-clearance-id',
            section: { code: 'BCA' },
            status: { code: 'CLEAR' }
          }
        ]
      };

      mockApplicationFindUnique.mockResolvedValue(mockApplication as any);

      const result = await GUARDS.GUARD_CLEARANCES_COMPLETE(mockContext);

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('Housing clearance not obtained');
    });
  });

  describe('GUARD_ACCOUNTS_CALCULATED', () => {
    it('should pass when accounts breakdown is calculated', async () => {
      const mockApplication = {
        id: 'test-app-id',
        accountsBreakdown: {
          id: 'breakdown-id',
          totalAmount: 1000
        }
      };

      mockApplicationFindUnique.mockResolvedValue(mockApplication as any);

      const result = await GUARDS.GUARD_ACCOUNTS_CALCULATED(mockContext);

      expect(result.canTransition).toBe(true);
      expect(result.reason).toContain('Accounts breakdown calculated');
    });

    it('should fail when accounts breakdown not found', async () => {
      const mockApplication = {
        id: 'test-app-id',
        accountsBreakdown: null
      };

      mockApplicationFindUnique.mockResolvedValue(mockApplication as any);

      const result = await GUARDS.GUARD_ACCOUNTS_CALCULATED(mockContext);

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('Accounts breakdown not calculated');
    });

    it('should fail when total amount is invalid', async () => {
      const mockApplication = {
        id: 'test-app-id',
        accountsBreakdown: {
          id: 'breakdown-id',
          totalAmount: 0
        }
      };

      mockApplicationFindUnique.mockResolvedValue(mockApplication as any);

      const result = await GUARDS.GUARD_ACCOUNTS_CALCULATED(mockContext);

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('Invalid total amount in accounts breakdown');
    });
  });

  describe('GUARD_PAYMENT_VERIFIED', () => {
    it('should pass when payment is verified', async () => {
      const mockApplication = {
        id: 'test-app-id',
        accountsBreakdown: {
          id: 'breakdown-id',
          totalAmount: 1000,
          paidAmount: 1000,
          paymentVerified: true
        }
      };

      mockApplicationFindUnique.mockResolvedValue(mockApplication as any);

      const result = await GUARDS.GUARD_PAYMENT_VERIFIED(mockContext);

      expect(result.canTransition).toBe(true);
      expect(result.reason).toContain('Payment verified');
    });

    it('should fail when payment not verified', async () => {
      const mockApplication = {
        id: 'test-app-id',
        accountsBreakdown: {
          id: 'breakdown-id',
          totalAmount: 1000,
          paidAmount: 1000,
          paymentVerified: false
        }
      };

      mockApplicationFindUnique.mockResolvedValue(mockApplication as any);

      const result = await GUARDS.GUARD_PAYMENT_VERIFIED(mockContext);

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('Payment not verified');
    });

    it('should fail when insufficient payment amount', async () => {
      const mockApplication = {
        id: 'test-app-id',
        accountsBreakdown: {
          id: 'breakdown-id',
          totalAmount: 1000,
          paidAmount: 500,
          paymentVerified: true
        }
      };

      mockApplicationFindUnique.mockResolvedValue(mockApplication as any);

      const result = await GUARDS.GUARD_PAYMENT_VERIFIED(mockContext);

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('Insufficient payment amount');
    });
  });

  describe('GUARD_APPROVAL_COMPLETE', () => {
    it('should pass when APPROVER has completed approval', async () => {
      const mockApplication = {
        id: 'test-app-id',
        reviews: [
          {
            id: 'review-id',
            section: { code: 'APPROVER' },
            status: 'APPROVED'
          }
        ]
      };

      mockApplicationFindUnique.mockResolvedValue(mockApplication as any);

      const result = await GUARDS.GUARD_APPROVAL_COMPLETE({
        ...mockContext,
        userRole: 'APPROVER'
      });

      expect(result.canTransition).toBe(true);
      expect(result.reason).toContain('Approval completed');
    });

    it('should fail when user is not APPROVER', async () => {
      const result = await GUARDS.GUARD_APPROVAL_COMPLETE(mockContext);

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('Only APPROVER can complete approval');
    });

    it('should fail when approver review not completed', async () => {
      const mockApplication = {
        id: 'test-app-id',
        reviews: []
      };

      mockApplicationFindUnique.mockResolvedValue(mockApplication as any);

      const result = await GUARDS.GUARD_APPROVAL_COMPLETE({
        ...mockContext,
        userRole: 'APPROVER'
      });

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('Approver review not completed');
    });
  });

  describe('GUARD_APPROVAL_REJECTED', () => {
    it('should pass when APPROVER has rejected approval', async () => {
      const mockApplication = {
        id: 'test-app-id',
        reviews: [
          {
            id: 'review-id',
            section: { code: 'APPROVER' },
            status: 'REJECTED'
          }
        ]
      };

      mockApplicationFindUnique.mockResolvedValue(mockApplication as any);

      const result = await GUARDS.GUARD_APPROVAL_REJECTED({
        ...mockContext,
        userRole: 'APPROVER'
      });

      expect(result.canTransition).toBe(true);
      expect(result.reason).toContain('Approval rejected');
    });

    it('should fail when user is not APPROVER', async () => {
      const result = await GUARDS.GUARD_APPROVAL_REJECTED(mockContext);

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('Only APPROVER can reject approval');
    });

    it('should fail when approver rejection not found', async () => {
      const mockApplication = {
        id: 'test-app-id',
        reviews: []
      };

      mockApplicationFindUnique.mockResolvedValue(mockApplication as any);

      const result = await GUARDS.GUARD_APPROVAL_REJECTED({
        ...mockContext,
        userRole: 'APPROVER'
      });

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('Approver rejection not found');
    });
  });

  describe('GUARD_DEED_FINALIZED', () => {
    it('should pass when transfer deed is finalized', async () => {
      const mockApplication = {
        id: 'test-app-id',
        transferDeed: {
          id: 'deed-id',
          isFinalized: true,
          hashSha256: 'test-hash',
          finalizedAt: new Date()
        }
      };

      mockApplicationFindUnique.mockResolvedValue(mockApplication as any);

      const result = await GUARDS.GUARD_DEED_FINALIZED(mockContext);

      expect(result.canTransition).toBe(true);
      expect(result.reason).toContain('Transfer deed finalized');
    });

    it('should fail when transfer deed not created', async () => {
      const mockApplication = {
        id: 'test-app-id',
        transferDeed: null
      };

      mockApplicationFindUnique.mockResolvedValue(mockApplication as any);

      const result = await GUARDS.GUARD_DEED_FINALIZED(mockContext);

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('Transfer deed not created');
    });

    it('should fail when transfer deed not finalized', async () => {
      const mockApplication = {
        id: 'test-app-id',
        transferDeed: {
          id: 'deed-id',
          isFinalized: false,
          hashSha256: null,
          finalizedAt: null
        }
      };

      mockApplicationFindUnique.mockResolvedValue(mockApplication as any);

      const result = await GUARDS.GUARD_DEED_FINALIZED(mockContext);

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('Transfer deed not finalized');
    });

    it('should fail when transfer deed hash not generated', async () => {
      const mockApplication = {
        id: 'test-app-id',
        transferDeed: {
          id: 'deed-id',
          isFinalized: true,
          hashSha256: null,
          finalizedAt: new Date()
        }
      };

      mockApplicationFindUnique.mockResolvedValue(mockApplication as any);

      const result = await GUARDS.GUARD_DEED_FINALIZED(mockContext);

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('Transfer deed hash not generated');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockApplicationFindUnique.mockRejectedValue(new Error('Database error'));

      const result = await GUARDS.GUARD_INTAKE_COMPLETE(mockContext);

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('Error checking intake completeness');
    });
  });
});
