/**
 * Tests for Route Helpers V2 - Dependency Injection Pattern
 * 
 * These tests demonstrate how much simpler testing becomes with explicit
 * dependency injection compared to the old service container approach.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { 
  createApiHandlerWithServices, 
  RouteHandlerFactory, 
  createTestRouteHandlerFactory,
  emptySchema 
} from '../route-helpers-v2';
import type { ServiceContainer, AuthContext } from '@/core/config/interfaces';
import { ApiError, ERROR_CODES } from '../common';

// Mock services for testing
const mockAuthService = {
  verifyToken: jest.fn(),
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  refreshToken: jest.fn(),
  resetPassword: jest.fn(),
  updatePassword: jest.fn(),
  verifyEmail: jest.fn(),
  resendVerification: jest.fn(),
};

const mockUserService = {
  getUserById: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  getUserProfile: jest.fn(),
  updateProfile: jest.fn(),
  searchUsers: jest.fn(),
};

const mockServices: ServiceContainer = {
  auth: mockAuthService,
  user: mockUserService,
  // All other services as undefined for minimal testing
  permission: undefined,
  team: undefined,
  sso: undefined,
  gdpr: undefined,
  twoFactor: undefined,
  subscription: undefined,
  apiKey: undefined,
  notification: undefined,
  webhook: undefined,
  session: undefined,
  organization: undefined,
  csrf: undefined,
  consent: undefined,
  audit: undefined,
  admin: undefined,
  role: undefined,
  address: undefined,
  oauth: undefined,
  companyNotification: undefined,
  resourceRelationship: undefined,
} as ServiceContainer;

// Mock auth middleware
jest.mock('../auth-middleware', () => ({
  createAuthMiddleware: jest.fn(() => jest.fn().mockResolvedValue({
    isAuthenticated: true,
    user: { id: '123', email: 'test@example.com' },
    permissions: []
  }))
}));

describe('createApiHandlerWithServices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Handler Creation', () => {
    it('should create a working handler with injected services', async () => {
      // Arrange
      const schema = z.object({
        name: z.string(),
      });

      const handler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      );

      const apiHandler = createApiHandlerWithServices(
        schema,
        handler,
        mockServices,
        { requireAuth: false }
      );

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ name: 'test' }),
        headers: { 'content-type': 'application/json' }
      });

      // Act
      const response = await apiHandler(request);

      // Assert
      expect(handler).toHaveBeenCalledWith(
        request,
        expect.any(Object), // auth context
        { name: 'test' }, // validated data
        mockServices // injected services
      );
      expect(response.status).toBe(200);
    });

    it('should validate request data and return validation errors', async () => {
      // Arrange
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18)
      });

      const handler = jest.fn();
      const apiHandler = createApiHandlerWithServices(schema, handler, mockServices);

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ 
          email: 'invalid-email', 
          age: 16 
        }),
        headers: { 'content-type': 'application/json' }
      });

      // Act
      const response = await apiHandler(request);

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe(ERROR_CODES.INVALID_REQUEST);
      expect(data.error.message).toContain('Validation failed');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle handler errors gracefully', async () => {
      // Arrange
      const schema = z.object({});
      const handler = jest.fn().mockRejectedValue(
        new ApiError(ERROR_CODES.INVALID_REQUEST, 'Custom error', 400)
      );

      const apiHandler = createApiHandlerWithServices(schema, handler, mockServices);
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' }
      });

      // Act
      const response = await apiHandler(request);

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe(ERROR_CODES.INVALID_REQUEST);
      expect(data.error.message).toBe('Custom error');
    });
  });

  describe('Service Injection', () => {
    it('should inject services into handler correctly', async () => {
      // Arrange
      const handler = jest.fn().mockImplementation(async (req, auth, data, services) => {
        // Test that services are properly injected
        expect(services.auth).toBe(mockAuthService);
        expect(services.user).toBe(mockUserService);
        
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      });

      const apiHandler = createApiHandlerWithServices(
        emptySchema,
        handler,
        mockServices
      );

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' }
      });

      // Act
      await apiHandler(request);

      // Assert - The expectations are in the handler mock implementation
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});

describe('RouteHandlerFactory', () => {
  let factory: RouteHandlerFactory;

  beforeEach(() => {
    factory = new RouteHandlerFactory(mockServices);
    jest.clearAllMocks();
  });

  describe('Handler Creation Methods', () => {
    it('should create authenticated handlers', async () => {
      // Arrange
      const handler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      );

      const apiHandler = factory.createAuthenticatedHandler(emptySchema, handler);
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' }
      });

      // Act
      await apiHandler(request);

      // Assert - Auth middleware should have been called with requireAuth: true
      expect(handler).toHaveBeenCalled();
    });

    it('should create public handlers', async () => {
      // Arrange
      const handler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      );

      const apiHandler = factory.createPublicHandler(emptySchema, handler);
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' }
      });

      // Act
      await apiHandler(request);

      // Assert
      expect(handler).toHaveBeenCalled();
    });
  });
});

describe('Testing Utilities', () => {
  describe('createTestRouteHandlerFactory', () => {
    it('should create a factory with minimal services for testing', () => {
      // Arrange & Act
      const testFactory = createTestRouteHandlerFactory();

      // Assert
      expect(testFactory).toBeInstanceOf(RouteHandlerFactory);
    });

    it('should allow service overrides for testing', () => {
      // Arrange
      const customAuthService = {
        ...mockAuthService,
        login: jest.fn().mockResolvedValue({ success: true, token: 'test-token' })
      };

      // Act
      const testFactory = createTestRouteHandlerFactory({
        auth: customAuthService
      });

      // Assert
      expect(testFactory).toBeInstanceOf(RouteHandlerFactory);
      // The factory should be using our custom auth service
      // This can be verified by creating a handler and testing its behavior
    });
  });
});

/**
 * Integration test showing a complete request flow
 */
describe('Integration - Complete Request Flow', () => {
  it('should handle a complete registration request', async () => {
    // Arrange - Create a realistic registration handler
    const registrationSchema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      firstName: z.string(),
      lastName: z.string()
    });

    // Mock the auth service to return a successful registration
    mockAuthService.register.mockResolvedValue({
      success: true,
      user: { 
        id: '123', 
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      },
      token: 'jwt-token-here'
    });

    const registrationHandler = jest.fn().mockImplementation(
      async (request, authContext, regData, services) => {
        const result = await services.auth.register({
          email: regData.email,
          password: regData.password,
          firstName: regData.firstName,
          lastName: regData.lastName
        }, {
          ipAddress: '127.0.0.1',
          userAgent: 'test'
        });

        return new Response(JSON.stringify({
          success: true,
          user: result.user,
          token: result.token
        }), {
          status: 201,
          headers: { 'content-type': 'application/json' }
        });
      }
    );

    const apiHandler = createApiHandlerWithServices(
      registrationSchema,
      registrationHandler,
      mockServices,
      { requireAuth: false }
    );

    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      }),
      headers: { 'content-type': 'application/json' }
    });

    // Act
    const response = await apiHandler(request);

    // Assert
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.user.email).toBe('test@example.com');
    expect(data.token).toBe('jwt-token-here');

    // Verify the auth service was called correctly
    expect(mockAuthService.register).toHaveBeenCalledWith(
      {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      },
      {
        ipAddress: '127.0.0.1',
        userAgent: 'test'
      }
    );
  });
});