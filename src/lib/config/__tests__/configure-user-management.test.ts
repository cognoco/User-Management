/**
 * Tests for the centralized user management configuration
 * 
 * These tests demonstrate how the new architecture makes testing simple:
 * 1. No circular dependencies to mock
 * 2. Pure functions that are easy to test
 * 3. Explicit dependency injection
 * 4. Clean test setup
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { configureUserManagement, createMinimalServices } from '../configure-user-management';
import { AdapterRegistry } from '@/adapters/registry';
import type { AuthService } from '@/core/auth/interfaces';
import type { UserService } from '@/core/user/interfaces';

// Mock the adapter registry
jest.mock('@/adapters/registry');

// Mock service implementations for testing
const mockAuthService: jest.Mocked<AuthService> = {
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

const mockUserService: jest.Mocked<UserService> = {
  getUserById: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  getUserProfile: jest.fn(),
  updateProfile: jest.fn(),
  searchUsers: jest.fn(),
};

const mockAdapterRegistry = {
  getAdapter: jest.fn(),
  registerAdapter: jest.fn(),
  getInstance: jest.fn(),
};

describe('configureUserManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AdapterRegistry.getInstance as jest.Mock).mockReturnValue(mockAdapterRegistry);
  });

  describe('Basic Configuration', () => {
    it('should create a complete service container with default configuration', () => {
      // Arrange
      mockAdapterRegistry.getAdapter.mockImplementation((type: string) => {
        switch (type) {
          case 'auth': return {};
          case 'user': return {};
          default: return {};
        }
      });

      // Act
      const services = configureUserManagement();

      // Assert
      expect(services).toHaveProperty('auth');
      expect(services).toHaveProperty('user');
      expect(services.auth).toBeDefined();
      expect(services.user).toBeDefined();
    });

    it('should use service overrides when provided', () => {
      // Arrange
      const config = {
        services: {
          auth: mockAuthService,
          user: mockUserService,
        }
      };

      // Act
      const services = configureUserManagement(config);

      // Assert
      expect(services.auth).toBe(mockAuthService);
      expect(services.user).toBe(mockUserService);
    });

    it('should respect feature flags to disable services', () => {
      // Arrange
      const config = {
        featureFlags: {
          permissions: false,
          teams: false,
          sso: false,
        }
      };

      // Act
      const services = configureUserManagement(config);

      // Assert
      expect(services.permission).toBeUndefined();
      expect(services.team).toBeUndefined();
      expect(services.sso).toBeUndefined();
    });
  });

  describe('Dependency Injection', () => {
    it('should use injected adapter registry for testing', () => {
      // Arrange
      const testRegistry = {
        getAdapter: jest.fn().mockReturnValue({}),
      } as any;

      const config = {
        dependencies: {
          adapterRegistry: testRegistry,
        }
      };

      // Act
      configureUserManagement(config);

      // Assert
      expect(testRegistry.getAdapter).toHaveBeenCalledWith('auth');
      expect(testRegistry.getAdapter).toHaveBeenCalledWith('user');
    });

    it('should create services with proper dependency chain', () => {
      // Arrange
      mockAdapterRegistry.getAdapter.mockReturnValue({});

      // Act
      const services = configureUserManagement();

      // Assert - User service should have been created with auth service dependency
      expect(services.auth).toBeDefined();
      expect(services.user).toBeDefined();
      // The user service should have received the auth service as a dependency
      expect(mockAdapterRegistry.getAdapter).toHaveBeenCalledWith('auth');
      expect(mockAdapterRegistry.getAdapter).toHaveBeenCalledWith('user');
    });
  });

  describe('createMinimalServices', () => {
    it('should create minimal services for testing', () => {
      // Arrange
      mockAdapterRegistry.getAdapter.mockReturnValue({});

      // Act
      const services = createMinimalServices();

      // Assert - Only required services should be defined
      expect(services.auth).toBeDefined();
      expect(services.user).toBeDefined();
      
      // Optional services should be undefined due to feature flags
      expect(services.permission).toBeUndefined();
      expect(services.team).toBeUndefined();
      expect(services.sso).toBeUndefined();
    });

    it('should allow overriding specific services for testing', () => {
      // Arrange
      const overrides = {
        auth: mockAuthService,
      };

      // Act
      const services = createMinimalServices(overrides);

      // Assert
      expect(services.auth).toBe(mockAuthService);
      expect(services.user).toBeDefined();
      expect(services.user).not.toBe(mockUserService); // Should be created, not overridden
    });
  });
});

/**
 * Integration test showing how easy it is to test the entire configuration
 */
describe('Integration - Full Configuration', () => {
  it('should create a working service container that can be used in routes', async () => {
    // Arrange - Create mock providers that return successful results
    const mockAuthProvider = {
      register: jest.fn().mockResolvedValue({
        success: true,
        user: { id: '123', email: 'test@example.com' },
        token: 'test-token'
      })
    };

    const mockUserProvider = {
      findById: jest.fn().mockResolvedValue({
        id: '123',
        email: 'test@example.com'
      })
    };

    mockAdapterRegistry.getAdapter.mockImplementation((type: string) => {
      switch (type) {
        case 'auth': return mockAuthProvider;
        case 'user': return mockUserProvider;
        default: return {};
      }
    });

    // Act - Configure services
    const services = configureUserManagement({
      featureFlags: {
        // Enable only what we need for this test
        audit: true,
        notifications: false,
      }
    });

    // Assert - Services should be working
    expect(services.auth).toBeDefined();
    expect(services.user).toBeDefined();
    
    // Test that services actually work
    const registrationResult = await services.auth.register({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    }, {
      ipAddress: '127.0.0.1',
      userAgent: 'test'
    });

    expect(registrationResult.success).toBe(true);
    expect(registrationResult.user?.email).toBe('test@example.com');
  });
});