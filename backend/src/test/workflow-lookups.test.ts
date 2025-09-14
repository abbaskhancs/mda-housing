import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { getAvailableGuards, getGuardDescription, executeGuard, validateGuardContext } from '../guards/workflowGuards';

const prisma = new PrismaClient();

describe('Workflow Lookups Endpoints', () => {
  beforeAll(async () => {
    // Ensure database is seeded
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Guard Functions', () => {
    it('should return available guards', () => {
      const guards = getAvailableGuards();
      expect(guards).toBeDefined();
      expect(Array.isArray(guards)).toBe(true);
      expect(guards.length).toBeGreaterThan(0);
    });

    it('should return guard descriptions', () => {
      const guards = getAvailableGuards();
      guards.forEach(guardName => {
        const description = getGuardDescription(guardName);
        expect(description).toBeDefined();
        expect(typeof description).toBe('string');
        expect(description.length).toBeGreaterThan(0);
      });
    });

    it('should validate guard context correctly', () => {
      const validContext = {
        applicationId: 'test-app-id',
        userId: 'test-user-id',
        userRole: 'OWO',
        fromStageId: 'test-from-stage',
        toStageId: 'test-to-stage'
      };

      const invalidContext = {
        applicationId: '',
        userId: 'test-user-id',
        userRole: 'OWO',
        fromStageId: 'test-from-stage',
        toStageId: 'test-to-stage'
      };

      expect(validateGuardContext(validContext)).toBe(true);
      expect(validateGuardContext(invalidContext)).toBe(false);
    });
  });

  describe('Workflow Data', () => {
    it('should have workflow stages', async () => {
      const stages = await prisma.wfStage.findMany();
      expect(stages).toBeDefined();
      expect(Array.isArray(stages)).toBe(true);
      expect(stages.length).toBeGreaterThan(0);
    });

    it('should have workflow transitions', async () => {
      const transitions = await prisma.wfTransition.findMany();
      expect(transitions).toBeDefined();
      expect(Array.isArray(transitions)).toBe(true);
      expect(transitions.length).toBeGreaterThan(0);
    });

    it('should have workflow sections', async () => {
      const sections = await prisma.wfSection.findMany();
      expect(sections).toBeDefined();
      expect(Array.isArray(sections)).toBe(true);
      expect(sections.length).toBeGreaterThan(0);
    });

    it('should have workflow statuses', async () => {
      const statuses = await prisma.wfStatus.findMany();
      expect(statuses).toBeDefined();
      expect(Array.isArray(statuses)).toBe(true);
      expect(statuses.length).toBeGreaterThan(0);
    });
  });

  describe('Transitions with Guards', () => {
    it('should get transitions from a specific stage', async () => {
      const stage = await prisma.wfStage.findFirst();
      expect(stage).toBeDefined();

      if (stage) {
        const transitions = await prisma.wfTransition.findMany({
          where: { fromStageId: stage.id },
          include: {
            fromStage: true,
            toStage: true
          }
        });

        expect(transitions).toBeDefined();
        expect(Array.isArray(transitions)).toBe(true);
      }
    });

    it('should have guard names for transitions', async () => {
      const transitions = await prisma.wfTransition.findMany({
        take: 5
      });

      transitions.forEach(transition => {
        expect(transition.guardName).toBeDefined();
        expect(typeof transition.guardName).toBe('string');
        expect(transition.guardName.length).toBeGreaterThan(0);
      });
    });
  });
});
