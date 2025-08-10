/**
 * Test Service Factory - Simple Test Setup
 * 
 * This module provides easy-to-use test utilities for creating
 * mock services and setting up test environments. It eliminates
 * the complexity of mocking the entire service container.
 * 
 * Key features:
 * 1. One-line test setup
 * 2. Type-safe mock services
 * 3. Preconfigured test scenarios
 * 4. Easy cleanup between tests
 * 5. No circular dependencies
 */

import { vi } from 'vitest';
import type { 
  ServiceContainer,
  AuthService,
  UserService,
  PermissionService,
  TeamService,
  SsoService,
  GdprService,
  TwoFactorService,
  SubscriptionService,
  ApiKeyService,
  NotificationService,
  SessionService,
  OrganizationService,
  CsrfService,
  ConsentService,
  AuditService,
  AdminService,
  RoleService,
  OAuthService
} from '@/core/config/interfaces';
import type { User, Session, AuthError } from '@/core/auth/models';
import type { Permission } from '@/core/permission/models';
import { createApiServices } from '@/lib/services/factory';

/**
 * Create a mock auth service with common test methods
 */
export function createMockAuthService(): AuthService {
  return {
    register: vi.fn().mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      createdAt: new Date(),
      updatedAt: new Date()
    } as User),
    
    login: vi.fn().mockResolvedValue({
      id: 'test-session-id',
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        createdAt: new Date(),
        updatedAt: new Date()
      } as User,
      token: 'test-token',
      expiresAt: new Date(Date.now() + 3600000)
    } as Session),
    
    logout: vi.fn().mockResolvedValue(undefined),
    
    validateSession: vi.fn().mockResolvedValue({
      id: 'test-session-id',
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        createdAt: new Date(),
        updatedAt: new Date()
      } as User,
      token: 'test-token',
      expiresAt: new Date(Date.now() + 3600000)
    } as Session),
    
    refreshSession: vi.fn().mockResolvedValue({
      id: 'test-session-id',
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        createdAt: new Date(),
        updatedAt: new Date()
      } as User,
      token: 'new-test-token',
      expiresAt: new Date(Date.now() + 3600000)
    } as Session),
    
    requestPasswordReset: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn().mockResolvedValue(undefined),
    changePassword: vi.fn().mockResolvedValue(undefined),
    verifyEmail: vi.fn().mockResolvedValue(undefined),
    resendVerificationEmail: vi.fn().mockResolvedValue(undefined),
    updateProfile: vi.fn().mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      firstName: 'Updated',
      lastName: 'User',
      createdAt: new Date(),
      updatedAt: new Date()
    } as User),
    
    deleteAccount: vi.fn().mockResolvedValue(undefined),
    
    // OAuth methods
    initiateOAuthFlow: vi.fn().mockResolvedValue('https://oauth.example.com/authorize'),
    handleOAuthCallback: vi.fn().mockResolvedValue({
      id: 'test-session-id',
      user: {
        id: 'test-user-id',
        email: 'oauth@example.com',
        firstName: 'OAuth',
        lastName: 'User',
        createdAt: new Date(),
        updatedAt: new Date()
      } as User,
      token: 'oauth-token',
      expiresAt: new Date(Date.now() + 3600000)
    } as Session),
    
    // Two-factor methods
    enableTwoFactor: vi.fn().mockResolvedValue({ secret: 'test-secret', qrCode: 'data:image/png;base64,...' }),
    verifyTwoFactor: vi.fn().mockResolvedValue(undefined),
    disableTwoFactor: vi.fn().mockResolvedValue(undefined),
    
    // Session management
    getSessions: vi.fn().mockResolvedValue([]),
    revokeSession: vi.fn().mockResolvedValue(undefined),
    revokeAllSessions: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuthService;
}

/**
 * Create a mock user service
 */
export function createMockUserService(): UserService {
  return {
    create: vi.fn().mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      createdAt: new Date(),
      updatedAt: new Date()
    } as User),
    
    findById: vi.fn().mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      createdAt: new Date(),
      updatedAt: new Date()
    } as User),
    
    findByEmail: vi.fn().mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      createdAt: new Date(),
      updatedAt: new Date()
    } as User),
    
    findAll: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      firstName: 'Updated',
      lastName: 'User',
      createdAt: new Date(),
      updatedAt: new Date()
    } as User),
    
    delete: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
  } as unknown as UserService;
}

/**
 * Create a mock permission service
 */
export function createMockPermissionService(): PermissionService {
  return {
    getUserPermissions: vi.fn().mockResolvedValue([
      { id: 'perm-1', name: 'read:users', description: 'Read users' },
      { id: 'perm-2', name: 'write:users', description: 'Write users' }
    ] as Permission[]),
    
    checkPermission: vi.fn().mockResolvedValue(true),
    checkPermissions: vi.fn().mockResolvedValue(true),
    grantPermission: vi.fn().mockResolvedValue(undefined),
    revokePermission: vi.fn().mockResolvedValue(undefined),
    getAllPermissions: vi.fn().mockResolvedValue([]),
    createPermission: vi.fn().mockResolvedValue({
      id: 'new-perm',
      name: 'test:permission',
      description: 'Test permission'
    } as Permission),
    deletePermission: vi.fn().mockResolvedValue(undefined),
  } as unknown as PermissionService;
}

/**
 * Service Test Helper - Main test utility class
 * 
 * Provides convenient methods for setting up test scenarios.
 */
export class ServiceTestHelper {
  private services: Partial<ServiceContainer> = {};
  
  /**
   * Create a complete mock service container
   */
  createMockServices(): ServiceContainer {
    return {
      auth: createMockAuthService(),
      user: createMockUserService(),
      permission: createMockPermissionService(),
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
    };
  }
  
  /**
   * Setup successful authentication scenario
   */
  setupSuccessfulAuth(): ServiceContainer {
    const services = this.createMockServices();
    
    // Configure auth service for successful scenarios
    const authService = services.auth as ReturnType<typeof createMockAuthService>;
    authService.login.mockResolvedValue({
      id: 'session-123',
      user: {
        id: 'user-123',
        email: 'success@example.com',
        firstName: 'Success',
        lastName: 'User',
        createdAt: new Date(),
        updatedAt: new Date()
      } as User,
      token: 'valid-token',
      expiresAt: new Date(Date.now() + 3600000)
    } as Session);
    
    return services;
  }
  
  /**
   * Setup failed authentication scenario
   */
  setupFailedAuth(): ServiceContainer {
    const services = this.createMockServices();
    
    // Configure auth service for failure scenarios
    const authService = services.auth as ReturnType<typeof createMockAuthService>;
    authService.login.mockRejectedValue({
      code: 'AUTH_ERROR',
      message: 'Invalid credentials'
    } as AuthError);
    
    authService.validateSession.mockResolvedValue(null);
    
    return services;
  }
  
  /**
   * Setup user with specific permissions
   */
  setupUserWithPermissions(permissions: string[]): ServiceContainer {
    const services = this.setupSuccessfulAuth();
    
    // Configure permission service
    const permissionService = services.permission as ReturnType<typeof createMockPermissionService>;
    permissionService.getUserPermissions.mockResolvedValue(
      permissions.map((name, i) => ({
        id: `perm-${i}`,
        name,
        description: `Permission ${name}`
      } as Permission))
    );
    
    permissionService.checkPermission.mockImplementation(async (userId, permission) => {
      return permissions.includes(permission);
    });
    
    permissionService.checkPermissions.mockImplementation(async (userId, requiredPermissions) => {
      return requiredPermissions.every(p => permissions.includes(p));
    });
    
    return services;
  }
  
  /**
   * Setup user already exists scenario
   */
  setupUserAlreadyExists(): ServiceContainer {
    const services = this.createMockServices();
    
    // Configure auth service for duplicate user
    const authService = services.auth as ReturnType<typeof createMockAuthService>;
    authService.register.mockRejectedValue({
      code: 'USER_ALREADY_EXISTS',
      message: 'User already exists'
    } as AuthError);
    
    // Configure user service
    const userService = services.user as ReturnType<typeof createMockUserService>;
    userService.findByEmail.mockResolvedValue({
      id: 'existing-user',
      email: 'existing@example.com',
      firstName: 'Existing',
      lastName: 'User',
      createdAt: new Date(),
      updatedAt: new Date()
    } as User);
    
    return services;
  }
  
  /**
   * Reset all mocks
   */
  reset(): void {
    vi.clearAllMocks();
    this.services = {};
  }
}

/**
 * Create a test environment with mock services
 * 
 * This is a convenience function for quickly setting up tests.
 * 
 * @example
 * ```typescript
 * const { services, helper } = createTestEnv();
 * helper.setupSuccessfulAuth();
 * 
 * // Use services in your test
 * const result = await myFunction(services);
 * ```
 */
export function createTestEnv() {
  const helper = new ServiceTestHelper();
  const services = helper.createMockServices();
  
  return {
    services,
    helper,
    reset: () => helper.reset()
  };
}

/**
 * Create services with specific mocks
 * 
 * This allows you to provide specific mock implementations
 * while using defaults for everything else.
 * 
 * @example
 * ```typescript
 * const services = createServicesWithMocks({
 *   auth: myCustomAuthMock,
 *   user: myCustomUserMock
 * });
 * ```
 */
export function createServicesWithMocks(mocks: Partial<ServiceContainer>): ServiceContainer {
  const helper = new ServiceTestHelper();
  const defaults = helper.createMockServices();
  
  return {
    ...defaults,
    ...mocks
  };
}