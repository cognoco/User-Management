/**
 * Registration Route Tests - Demonstrating Clean Testing Without Circular Dependencies
 * 
 * This test file shows how easy testing becomes with the hybrid DI solution:
 * - No complex mocking setup
 * - Clean service injection
 * - Isolated test execution
 * - Type-safe throughout
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from './route';
import { ServiceTestHelper, createMockRequest, TestData } from '@/tests/utils/test-service-factory';

describe('POST /api/auth/register-v2', () => {
  let testHelper: ServiceTestHelper;

  beforeEach(() => {
    testHelper = new ServiceTestHelper();
  });

  describe('Private User Registration', () => {
    it('should register a private user successfully', async () => {
      // Setup: Mock successful registration
      testHelper.setupRegistrationSuccess({
        user: {
          id: 'new-user-123',
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
          userType: 'private',
          emailVerified: false,
        },
        token: 'jwt-token-123',
        refreshToken: 'refresh-token-123',
        requiresEmailConfirmation: true,
      });

      // Test: Send registration request
      const request = createMockRequest({
        method: 'POST',
        body: {
          userType: 'private',
          email: 'john@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
          acceptTerms: true,
        }
      });

      const response = await POST(request);
      const data = await response.json();

      // Assert: Successful response
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.user.email).toBe('john@example.com');
      expect(data.user.firstName).toBe('John');
      expect(data.user.userType).toBe('private');
      expect(data.token).toBe('jwt-token-123');
      expect(data.requiresEmailConfirmation).toBe(true);

      // Assert: Auth service was called correctly
      const mockAuth = testHelper.container.auth as any;
      expect(mockAuth.register).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
          userType: 'private',
          profile: expect.objectContaining({
            acceptTerms: true,
          }),
        }),
        expect.objectContaining({
          ipAddress: expect.any(String),
          userAgent: expect.any(String),
          timestamp: expect.any(String),
        })
      );
    });

    it('should validate required fields for private user', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {
          userType: 'private',
          email: 'john@example.com',
          password: 'SecurePass123!',
          // Missing firstName, lastName, acceptTerms
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toBeDefined();

      // Service should not be called for invalid input
      const mockAuth = testHelper.container.auth as any;
      expect(mockAuth.register).not.toHaveBeenCalled();
    });

    it('should validate password strength', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {
          userType: 'private',
          email: 'john@example.com',
          password: 'weak', // Too weak
          firstName: 'John',
          lastName: 'Doe',
          acceptTerms: true,
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details.some((err: any) => 
        err.path.includes('password') && err.message.includes('8 characters')
      )).toBe(true);
    });
  });

  describe('Corporate User Registration', () => {
    it('should register a corporate user successfully', async () => {
      testHelper.setupRegistrationSuccess({
        user: {
          id: 'corp-user-456',
          email: 'admin@acme.com',
          firstName: 'Jane',
          lastName: 'Smith',
          userType: 'corporate',
          emailVerified: false,
        },
        token: 'jwt-token-456',
        refreshToken: 'refresh-token-456',
        requiresEmailConfirmation: false,
      });

      const request = createMockRequest({
        method: 'POST',
        body: {
          userType: 'corporate',
          email: 'admin@acme.com',
          password: 'SecurePass123!',
          firstName: 'Jane',
          lastName: 'Smith',
          companyName: 'Acme Corp',
          companyWebsite: 'https://acme.com',
          department: 'Engineering',
          industry: 'Technology',
          companySize: '51-200',
          position: 'CTO',
          acceptTerms: true,
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.user.userType).toBe('corporate');

      const mockAuth = testHelper.container.auth as any;
      expect(mockAuth.register).toHaveBeenCalledWith(
        expect.objectContaining({
          userType: 'corporate',
          profile: expect.objectContaining({
            company: expect.objectContaining({
              name: 'Acme Corp',
              website: 'https://acme.com',
              department: 'Engineering',
              industry: 'Technology',
              size: '51-200',
            }),
            position: 'CTO',
          }),
        }),
        expect.any(Object)
      );
    });

    it('should require company name for corporate users', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {
          userType: 'corporate',
          email: 'admin@company.com',
          password: 'SecurePass123!',
          acceptTerms: true,
          // Missing companyName
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details.some((err: any) => 
        err.path.includes('companyName') && err.message.includes('required')
      )).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle existing user error', async () => {
      testHelper.setupRegistrationFailure({
        code: 'USER_ALREADY_EXISTS',
        message: 'User with this email already exists'
      });

      const request = createMockRequest({
        method: 'POST',
        body: {
          userType: 'private',
          email: 'existing@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
          acceptTerms: true,
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User already exists');
    });

    it('should handle password validation error', async () => {
      testHelper.setupRegistrationFailure({
        code: 'PASSWORD_TOO_WEAK',
        message: 'Password does not meet requirements'
      });

      const request = createMockRequest({
        method: 'POST',
        body: {
          userType: 'private',
          email: 'test@example.com',
          password: 'StrongPassword123!',
          firstName: 'Test',
          lastName: 'User',
          acceptTerms: true,
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Password too weak');
    });

    it('should handle generic server errors', async () => {
      testHelper.setupRegistrationFailure(new Error('Database connection failed'));

      const request = createMockRequest({
        method: 'POST',
        body: {
          userType: 'private',
          email: 'test@example.com',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          acceptTerms: true,
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Registration failed');
    });
  });

  describe('Request Context', () => {
    it('should extract IP address and user agent', async () => {
      testHelper.setupRegistrationSuccess(TestData.authResponse);

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.100',
          'user-agent': 'Mozilla/5.0 (Test Browser)',
        },
        body: {
          userType: 'private',
          email: 'test@example.com',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          acceptTerms: true,
        }
      });

      await POST(request);

      const mockAuth = testHelper.container.auth as any;
      expect(mockAuth.register).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Test Browser)',
        })
      );
    });
  });
});

/**
 * Key Testing Benefits Demonstrated:
 * 
 * 1. No Circular Dependencies: Tests don't struggle with complex import chains
 * 2. Clean Service Mocking: ServiceTestHelper makes mocking trivial
 * 3. Isolated Execution: Each test runs independently with fresh services
 * 4. Type Safety: Full TypeScript support throughout
 * 5. Easy Setup: Simple beforeEach setup, no complex configuration
 * 6. Readable Tests: Clear arrange-act-assert pattern
 * 7. Comprehensive Coverage: Easy to test success, validation, and error cases
 */