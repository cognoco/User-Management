/**
 * Tests for Registration Route V2
 * 
 * This demonstrates how much simpler route testing becomes with the new
 * dependency injection pattern. Compare this to testing the old route!
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { createTestRouteHandlerFactory } from '@/lib/api/route-helpers-v2';

// We can easily mock just the services we need for this route
const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  refreshToken: jest.fn(),
  verifyToken: jest.fn(),
  resetPassword: jest.fn(),
  updatePassword: jest.fn(),
  verifyEmail: jest.fn(),
  resendVerification: jest.fn(),
};

describe('Registration Route V2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Registration', () => {
    it('should register a private user successfully', async () => {
      // Arrange
      mockAuthService.register.mockResolvedValue({
        success: true,
        user: { 
          id: '123', 
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe'
        },
        token: 'jwt-token-here',
        requiresEmailConfirmation: false
      });

      // Create the route handler with mock services - this is SO MUCH easier!
      const testFactory = createTestRouteHandlerFactory({
        auth: mockAuthService
      });

      // Import the schema and handler logic (we'd extract these to be reusable)
      const { RegistrationSchema, createRegistrationHandler } = require('../route-v2');
      const POST = testFactory.createPublicHandler(
        RegistrationSchema,
        createRegistrationHandler,
        { rateLimit: { windowMs: 15 * 60 * 1000, max: 10 } }
      );

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          userType: 'private',
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
          acceptTerms: true
        }),
        headers: { 
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
          'user-agent': 'test-agent'
        }
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(201);
      
      const data = await response.json();
      expect(data.user.email).toBe('test@example.com');
      expect(data.token).toBe('jwt-token-here');

      // Verify the service was called with correct parameters
      expect(mockAuthService.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        metadata: {
          userType: 'private',
          acceptTerms: true
        }
      }, {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      });
    });

    it('should register a corporate user successfully', async () => {
      // Arrange
      mockAuthService.register.mockResolvedValue({
        success: true,
        user: { 
          id: '456', 
          email: 'jane@company.com',
          firstName: 'Jane',
          lastName: 'Smith'
        },
        token: 'jwt-token-corporate',
        requiresEmailConfirmation: false
      });

      const testFactory = createTestRouteHandlerFactory({
        auth: mockAuthService
      });

      const { RegistrationSchema, createRegistrationHandler } = require('../route-v2');
      const POST = testFactory.createPublicHandler(
        RegistrationSchema,
        createRegistrationHandler
      );

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          userType: 'corporate',
          email: 'jane@company.com',
          password: 'Password123!',
          firstName: 'Jane',
          lastName: 'Smith',
          companyName: 'Acme Corp',
          companyWebsite: 'https://acme.com',
          department: 'Engineering',
          industry: 'Technology',
          companySize: '51-200',
          position: 'Developer',
          acceptTerms: true
        }),
        headers: { 'content-type': 'application/json' }
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(201);
      
      const data = await response.json();
      expect(data.user.email).toBe('jane@company.com');

      // Verify corporate metadata was included
      expect(mockAuthService.register).toHaveBeenCalledWith({
        email: 'jane@company.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Smith',
        metadata: {
          userType: 'corporate',
          acceptTerms: true,
          companyName: 'Acme Corp',
          companyWebsite: 'https://acme.com',
          department: 'Engineering',
          industry: 'Technology',
          companySize: '51-200',
          position: 'Developer'
        }
      }, expect.any(Object));
    });
  });

  describe('Validation Errors', () => {
    it('should reject registration with invalid email', async () => {
      // Arrange
      const testFactory = createTestRouteHandlerFactory({
        auth: mockAuthService
      });

      const { RegistrationSchema, createRegistrationHandler } = require('../route-v2');
      const POST = testFactory.createPublicHandler(
        RegistrationSchema,
        createRegistrationHandler
      );

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          userType: 'private',
          email: 'invalid-email',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
          acceptTerms: true
        }),
        headers: { 'content-type': 'application/json' }
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error.message).toContain('Validation failed');
      expect(data.error.message).toContain('Invalid email address');
      
      // Service should not have been called
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it('should reject registration with weak password', async () => {
      // Arrange
      const testFactory = createTestRouteHandlerFactory({
        auth: mockAuthService
      });

      const { RegistrationSchema, createRegistrationHandler } = require('../route-v2');
      const POST = testFactory.createPublicHandler(
        RegistrationSchema,
        createRegistrationHandler
      );

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          userType: 'private',
          email: 'test@example.com',
          password: 'weak',
          firstName: 'John',
          lastName: 'Doe',
          acceptTerms: true
        }),
        headers: { 'content-type': 'application/json' }
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error.message).toContain('Password must be at least 8 characters long');
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it('should reject corporate registration without company name', async () => {
      // Arrange
      const testFactory = createTestRouteHandlerFactory({
        auth: mockAuthService
      });

      const { RegistrationSchema, createRegistrationHandler } = require('../route-v2');
      const POST = testFactory.createPublicHandler(
        RegistrationSchema,
        createRegistrationHandler
      );

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          userType: 'corporate',
          email: 'test@company.com',
          password: 'Password123!',
          acceptTerms: true
          // Missing companyName!
        }),
        headers: { 'content-type': 'application/json' }
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error.message).toContain('Company name is required');
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });
  });

  describe('Service Errors', () => {
    it('should handle user already exists error', async () => {
      // Arrange
      mockAuthService.register.mockResolvedValue({
        success: false,
        error: 'User with email test@example.com already exists'
      });

      const testFactory = createTestRouteHandlerFactory({
        auth: mockAuthService
      });

      const { RegistrationSchema, createRegistrationHandler } = require('../route-v2');
      const POST = testFactory.createPublicHandler(
        RegistrationSchema,
        createRegistrationHandler
      );

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          userType: 'private',
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
          acceptTerms: true
        }),
        headers: { 'content-type': 'application/json' }
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(409); // User already exists
      
      const data = await response.json();
      expect(data.error.code).toBe('USER_ALREADY_EXISTS');
    });

    it('should handle generic service errors', async () => {
      // Arrange
      mockAuthService.register.mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });

      const testFactory = createTestRouteHandlerFactory({
        auth: mockAuthService
      });

      const { RegistrationSchema, createRegistrationHandler } = require('../route-v2');
      const POST = testFactory.createPublicHandler(
        RegistrationSchema,
        createRegistrationHandler
      );

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          userType: 'private',
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
          acceptTerms: true
        }),
        headers: { 'content-type': 'application/json' }
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error.message).toBe('Database connection failed');
    });
  });
});

/**
 * Performance and Integration Tests
 */
describe('Registration Route V2 - Integration', () => {
  it('should handle concurrent registrations without service container conflicts', async () => {
    // This test demonstrates that the new pattern doesn't have the
    // global state issues that the old service container had
    
    // Arrange
    const mockAuthService1 = { ...mockAuthService };
    const mockAuthService2 = { ...mockAuthService };
    
    mockAuthService1.register = jest.fn().mockResolvedValue({
      success: true,
      user: { id: '1', email: 'user1@example.com' },
      token: 'token1'
    });
    
    mockAuthService2.register = jest.fn().mockResolvedValue({
      success: true,
      user: { id: '2', email: 'user2@example.com' },
      token: 'token2'
    });

    const factory1 = createTestRouteHandlerFactory({ auth: mockAuthService1 });
    const factory2 = createTestRouteHandlerFactory({ auth: mockAuthService2 });

    const { RegistrationSchema, createRegistrationHandler } = require('../route-v2');
    
    const POST1 = factory1.createPublicHandler(RegistrationSchema, createRegistrationHandler);
    const POST2 = factory2.createPublicHandler(RegistrationSchema, createRegistrationHandler);

    const request1 = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        userType: 'private',
        email: 'user1@example.com',
        password: 'Password123!',
        firstName: 'User',
        lastName: 'One',
        acceptTerms: true
      }),
      headers: { 'content-type': 'application/json' }
    });

    const request2 = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        userType: 'private',
        email: 'user2@example.com',
        password: 'Password123!',
        firstName: 'User',
        lastName: 'Two',
        acceptTerms: true
      }),
      headers: { 'content-type': 'application/json' }
    });

    // Act - Execute both requests concurrently
    const [response1, response2] = await Promise.all([
      POST1(request1),
      POST2(request2)
    ]);

    // Assert - Both should succeed with their respective services
    expect(response1.status).toBe(201);
    expect(response2.status).toBe(201);

    const data1 = await response1.json();
    const data2 = await response2.json();

    expect(data1.user.email).toBe('user1@example.com');
    expect(data2.user.email).toBe('user2@example.com');

    // Each service should have been called exactly once
    expect(mockAuthService1.register).toHaveBeenCalledTimes(1);
    expect(mockAuthService2.register).toHaveBeenCalledTimes(1);
  });
});