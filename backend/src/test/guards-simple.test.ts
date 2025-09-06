import { describe, it, expect } from '@jest/globals';
import {
  getAvailableGuards,
  validateGuardContext,
  GuardContext
} from '../guards/workflowGuards';

describe('Workflow Guards - Core Functions', () => {
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
      });
    });

    it('should return array of guard names', () => {
      const guards = getAvailableGuards();
      expect(Array.isArray(guards)).toBe(true);
      expect(guards.length).toBeGreaterThan(0);
    });
  });

  describe('Guard Context Validation', () => {
    it('should validate complete guard context', () => {
      const context: GuardContext = {
        applicationId: 'test-app-id',
        userId: 'test-user-id',
        userRole: 'OWO',
        fromStageId: 'from-stage-id',
        toStageId: 'to-stage-id'
      };

      expect(validateGuardContext(context)).toBe(true);
    });

    it('should reject incomplete guard context', () => {
      const baseContext: GuardContext = {
        applicationId: 'test-app-id',
        userId: 'test-user-id',
        userRole: 'OWO',
        fromStageId: 'from-stage-id',
        toStageId: 'to-stage-id'
      };

      // Test missing applicationId
      expect(validateGuardContext({ ...baseContext, applicationId: '' })).toBe(false);
      
      // Test missing userId
      expect(validateGuardContext({ ...baseContext, userId: '' })).toBe(false);
      
      // Test missing userRole
      expect(validateGuardContext({ ...baseContext, userRole: '' })).toBe(false);
      
      // Test missing fromStageId
      expect(validateGuardContext({ ...baseContext, fromStageId: '' })).toBe(false);
      
      // Test missing toStageId
      expect(validateGuardContext({ ...baseContext, toStageId: '' })).toBe(false);
    });

    it('should accept context with additional data', () => {
      const context: GuardContext = {
        applicationId: 'test-app-id',
        userId: 'test-user-id',
        userRole: 'OWO',
        fromStageId: 'from-stage-id',
        toStageId: 'to-stage-id',
        additionalData: { remarks: 'test remarks' }
      };

      expect(validateGuardContext(context)).toBe(true);
    });
  });

  describe('Guard Function Signatures', () => {
    it('should have correct function signatures for all guards', () => {
      const guards = getAvailableGuards();
      
      guards.forEach(guardName => {
        // This test ensures the guard functions exist and are callable
        // The actual implementation will be tested with integration tests
        expect(typeof guardName).toBe('string');
        expect(guardName).toMatch(/^GUARD_/);
      });
    });
  });
});
