import { describe, it, expect } from '@jest/globals';
import { authSchemas, personSchemas, applicationSchemas } from '../schemas/validation';

describe('Validation Schemas', () => {
  describe('Auth Schemas', () => {
    it('should validate login schema correctly', () => {
      const validData = {
        username: 'testuser',
        password: 'password123'
      };
      
      const result = authSchemas.login.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid login data', () => {
      const invalidData = {
        username: '',
        password: ''
      };
      
      const result = authSchemas.login.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate register schema correctly', () => {
      const validData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'ADMIN'
      };
      
      const result = authSchemas.register.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email in register', () => {
      const invalidData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123',
        role: 'ADMIN'
      };
      
      const result = authSchemas.register.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Person Schemas', () => {
    it('should validate CNIC format correctly', () => {
      const validData = {
        cnic: '12345-1234567-1',
        name: 'John Doe',
        fatherName: 'Jane Doe'
      };
      
      const result = personSchemas.create.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid CNIC format', () => {
      const invalidData = {
        cnic: '12345-1234567',
        name: 'John Doe',
        fatherName: 'Jane Doe'
      };
      
      const result = personSchemas.create.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate phone number format', () => {
      const validData = {
        cnic: '12345-1234567-1',
        name: 'John Doe',
        fatherName: 'Jane Doe',
        phone: '+923001234567'
      };
      
      const result = personSchemas.create.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Application Schemas', () => {
    it('should validate application creation', () => {
      const validData = {
        sellerId: 'clr12345678901234567890123',
        buyerId: 'clr12345678901234567890124',
        plotId: 'clr12345678901234567890125'
      };
      
      const result = applicationSchemas.create.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate application with attorney', () => {
      const validData = {
        sellerId: 'clr12345678901234567890123',
        buyerId: 'clr12345678901234567890124',
        attorneyId: 'clr12345678901234567890126',
        plotId: 'clr12345678901234567890125'
      };
      
      const result = applicationSchemas.create.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});
