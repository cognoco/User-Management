/**
 * Test Service Factory - Clean Testing Without Circular Dependencies
 * 
 * This module provides utilities for testing route handlers and services
 * without the circular dependency hell. Key benefits:
 * - Easy mock creation for any service
 * - Isolated test execution (no shared state)
 * - Type-safe service mocking
 * - Compatible with Vitest and Jest
 */

import { vi } from 'vitest';
import type { ServiceContainer } from '@/lib/services/factory';
import type { AuthService } from '@/core/auth/interfaces';
import type { UserService } from '@/core/user/interfaces';
import type { PermissionService } from '@/core/permission/interfaces';
import type { TeamService } from '@/core/team/interfaces';
import type { SessionService } from '@/core/session/interfaces';

/**
 * Create a complete mock service container for testing
 * All services are mocked by default, can be overridden with real implementations
 */
export function createMockServiceContainer(overrides: Partial<ServiceContainer> = {}): ServiceContainer {
  const mockAuth: AuthService = {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    validateToken: vi.fn(),
    refreshToken: vi.fn(),
    resetPassword: vi.fn(),
    changePassword: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    ...overrides.auth,
  } as any;

  const mockUser: UserService = {
    getUserById: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    getUserProfile: vi.fn(),
    updateProfile: vi.fn(),
    searchUsers: vi.fn(),
    getUserPreferences: vi.fn(),
    updatePreferences: vi.fn(),
    ...overrides.user,
  } as any;

  const mockPermission: PermissionService | undefined = overrides.permission !== null ? {
    checkPermission: vi.fn(),
    getUserPermissions: vi.fn(),
    grantPermission: vi.fn(),
    revokePermission: vi.fn(),
    listPermissions: vi.fn(),
    ...overrides.permission,
  } as any : undefined;

  const mockTeam: TeamService | undefined = overrides.team !== null ? {
    createTeam: vi.fn(),
    getTeam: vi.fn(),
    updateTeam: vi.fn(),
    deleteTeam: vi.fn(),
    addTeamMember: vi.fn(),
    removeTeamMember: vi.fn(),
    listTeamMembers: vi.fn(),
    getUserTeams: vi.fn(),
    ...overrides.team,
  } as any : undefined;

  const mockSession: SessionService | undefined = overrides.session !== null ? {
    createSession: vi.fn(),
    getSession: vi.fn(),
    updateSession: vi.fn(),
    deleteSession: vi.fn(),
    listUserSessions: vi.fn(),
    invalidateUserSessions: vi.fn(),
    ...overrides.session,
  } as any : undefined;

  return {
    auth: mockAuth,
    user: mockUser,
    permission: mockPermission,
    team: mockTeam,
    session: mockSession,
  };
}

/**
 * Reset all mocks in a service container
 * Useful in beforeEach hooks to ensure clean test state
 */
export function resetMockServiceContainer(container: ServiceContainer): void {
  // Reset all auth service mocks
  Object.values(container.auth as any).forEach(fn => {
    if (vi.isMockFunction(fn)) {
      fn.mockReset();
    }
  });

  // Reset all user service mocks
  Object.values(container.user as any).forEach(fn => {
    if (vi.isMockFunction(fn)) {
      fn.mockReset();
    }
  });

  // Reset optional service mocks
  if (container.permission) {
    Object.values(container.permission as any).forEach(fn => {
      if (vi.isMockFunction(fn)) {
        fn.mockReset();
      }
    });
  }

  if (container.team) {
    Object.values(container.team as any).forEach(fn => {
      if (vi.isMockFunction(fn)) {
        fn.mockReset();
      }
    });
  }

  if (container.session) {
    Object.values(container.session as any).forEach(fn => {
      if (vi.isMockFunction(fn)) {
        fn.mockReset();
      }
    });
  }
}

/**
 * Common test data factory
 */
export const TestData = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    emailVerified: true,
  },

  authResponse: {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    },
    token: 'test-jwt-token',
    refreshToken: 'test-refresh-token',
  },

  team: {
    id: 'test-team-id',
    name: 'Test Team',
    description: 'A test team',
    ownerId: 'test-user-id',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },

  permission: {
    id: 'test-permission-id',
    name: 'read:users',
    description: 'Permission to read user data',
  },
} as const;

/**
 * Create a mock request for testing route handlers
 */
export function createMockRequest(options: {
  method?: string;
  url?: string;
  body?: any;
  headers?: Record<string, string>;
} = {}): Request {
  const {
    method = 'GET',
    url = 'http://localhost/api/test',
    body = null,
    headers = {},
  } = options;

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    requestInit.body = JSON.stringify(body);
  }

  return new Request(url, requestInit);
}

/**
 * Mock the service container module for testing
 * Use this in your test files to replace the real service container
 */
export function mockServiceContainerModule(mockContainer: ServiceContainer) {
  return {
    getServiceContainer: vi.fn(() => mockContainer),
    configureServices: vi.fn(),
    resetServiceContainer: vi.fn(),
  };
}

/**
 * Test helper to setup service mocks with common patterns
 */
export class ServiceTestHelper {
  public container: ServiceContainer;

  constructor(overrides?: Partial<ServiceContainer>) {
    this.container = createMockServiceContainer(overrides);
  }

  /**
   * Setup successful auth flow
   */
  setupSuccessfulAuth(user = TestData.user) {
    const mockAuth = this.container.auth as any;
    mockAuth.getCurrentUser.mockResolvedValue(user);
    mockAuth.validateToken.mockResolvedValue(user);
    return this;
  }

  /**
   * Setup failed auth (no user)
   */
  setupFailedAuth() {
    const mockAuth = this.container.auth as any;
    mockAuth.getCurrentUser.mockResolvedValue(null);
    mockAuth.validateToken.mockResolvedValue(null);
    return this;
  }

  /**
   * Setup registration success
   */
  setupRegistrationSuccess(authResponse = TestData.authResponse) {
    const mockAuth = this.container.auth as any;
    mockAuth.register.mockResolvedValue(authResponse);
    return this;
  }

  /**
   * Setup registration failure
   */
  setupRegistrationFailure(error = new Error('Registration failed')) {
    const mockAuth = this.container.auth as any;
    mockAuth.register.mockRejectedValue(error);
    return this;
  }

  /**
   * Setup permission check success
   */
  setupPermissionCheck(hasPermission = true) {
    if (this.container.permission) {
      const mockPermission = this.container.permission as any;
      mockPermission.checkPermission.mockResolvedValue(hasPermission);
    }
    return this;
  }

  /**
   * Reset all mocks
   */
  reset() {
    resetMockServiceContainer(this.container);
    return this;
  }
}

/**
 * Example usage in tests:
 * 
 * ```typescript
 * import { ServiceTestHelper, createMockRequest } from '@/tests/utils/test-service-factory';
 * 
 * describe('Auth Routes', () => {
 *   let testHelper: ServiceTestHelper;
 * 
 *   beforeEach(() => {
 *     testHelper = new ServiceTestHelper();
 *   });
 * 
 *   it('should register user successfully', async () => {
 *     // Setup
 *     testHelper.setupRegistrationSuccess();
 *     const request = createMockRequest({
 *       method: 'POST',
 *       body: { email: 'test@example.com', password: 'password123' }
 *     });
 * 
 *     // Test with injected services
 *     const response = await routeHandler(testHelper.container, request);
 * 
 *     // Assert
 *     expect(response.status).toBe(200);
 *     expect(testHelper.container.auth.register).toHaveBeenCalledWith({
 *       email: 'test@example.com',
 *       password: 'password123'
 *     });
 *   });
 * });
 * ```
 */