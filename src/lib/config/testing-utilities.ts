/**
 * Testing Utilities for Dependency Injection
 * 
 * This module provides utilities to easily set up and tear down test environments
 * with mock services. It supports both the new dependency injection pattern
 * and legacy compatibility during migration.
 * 
 * Key benefits:
 * 1. Simple mock service setup
 * 2. Automatic cleanup between tests
 * 3. Type-safe mock creation
 * 4. Support for partial mocking
 * 5. Integration with popular testing frameworks
 */

import { vi, type Mock } from 'vitest';
import type { ServiceContainer } from '@/core/config/interfaces';
import type { AuthService } from '@/core/auth/interfaces';
import type { UserService } from '@/core/user/interfaces';
import type { PermissionService } from '@/core/permission/interfaces';

import { DependencyContainer } from './dependency-container';
import { ServiceLocator, initializeTestServiceLocator } from './service-locator';
import { MigrationTestUtils } from './migration-bridge';
import { AdapterRegistry } from '@/adapters/registry';

/**
 * Mock service factory for creating realistic test doubles
 */
export class MockServiceFactory {
  /**
   * Create a mock auth service with common methods
   */
  static createAuthService(): AuthService {
    return {
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      getCurrentUser: vi.fn(),
      refreshToken: vi.fn(),
      verifyEmail: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      enableMfa: vi.fn(),
      disableMfa: vi.fn(),
      verifyMfa: vi.fn(),
      // Add other methods as needed
    } as unknown as AuthService;
  }

  /**
   * Create a mock user service
   */
  static createUserService(): UserService {
    return {
      getUserById: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
      createUser: vi.fn(),
      getUserByEmail: vi.fn(),
      searchUsers: vi.fn(),
      // Add other methods as needed
    } as unknown as UserService;
  }

  /**
   * Create a mock permission service
   */
  static createPermissionService(): PermissionService {
    return {
      checkPermission: vi.fn(),
      getUserPermissions: vi.fn(),
      grantPermission: vi.fn(),
      revokePermission: vi.fn(),
      // Add other methods as needed
    } as unknown as PermissionService;
  }

  /**
   * Create a complete mock service container
   */
  static createServiceContainer(overrides: Partial<ServiceContainer> = {}): ServiceContainer {
    const defaultMocks: ServiceContainer = {
      auth: this.createAuthService(),
      user: this.createUserService(),
      permission: this.createPermissionService(),
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

    return { ...defaultMocks, ...overrides };
  }
}

/**
 * Test environment manager for dependency injection testing
 */
export class TestEnvironment {
  private static currentConfig: {
    container?: DependencyContainer;
    serviceContainer?: ServiceContainer;
    useNewPattern?: boolean;
  } = {};

  /**
   * Set up test environment with new dependency injection pattern
   */
  static setupWithDependencyInjection(
    mockServices: Partial<ServiceContainer> = {},
    mockProviders: Record<string, any> = {}
  ): ServiceContainer {
    // Create mock adapter registry
    const mockRegistry = new AdapterRegistry();
    
    // Register mock providers
    Object.entries(mockProviders).forEach(([key, provider]) => {
      mockRegistry.registerAdapter(key, provider);
    });

    // Create dependency container with mocks
    this.currentConfig.container = new DependencyContainer({
      services: mockServices,
      providers: mockProviders,
      features: {
        // Enable all features for comprehensive testing
        permissions: true,
        teams: true,
        // ... other features
      }
    });

    const serviceContainer = this.currentConfig.container.getServiceContainer();
    this.currentConfig.serviceContainer = serviceContainer;
    this.currentConfig.useNewPattern = true;

    return serviceContainer;
  }

  /**
   * Set up test environment with service locator pattern
   */
  static setupWithServiceLocator(
    mockServices: Partial<ServiceContainer> = {}
  ): ServiceContainer {
    initializeTestServiceLocator(mockServices);
    
    const serviceContainer = MockServiceFactory.createServiceContainer(mockServices);
    this.currentConfig.serviceContainer = serviceContainer;
    this.currentConfig.useNewPattern = true;

    return serviceContainer;
  }

  /**
   * Set up test environment with legacy compatibility
   */
  static setupWithLegacyCompatibility(
    mockServices: Partial<ServiceContainer> = {}
  ): ServiceContainer {
    MigrationTestUtils.setupLegacyCompatibilityTest(mockServices);
    
    const serviceContainer = MockServiceFactory.createServiceContainer(mockServices);
    this.currentConfig.serviceContainer = serviceContainer;
    this.currentConfig.useNewPattern = false;

    return serviceContainer;
  }

  /**
   * Get the current test service container
   */
  static getServiceContainer(): ServiceContainer {
    if (!this.currentConfig.serviceContainer) {
      throw new Error('Test environment not set up. Call one of the setup methods first.');
    }
    return this.currentConfig.serviceContainer;
  }

  /**
   * Clean up test environment
   */
  static cleanup(): void {
    // Clear service locator
    ServiceLocator.getInstance().clear();
    
    // Clean up migration state
    MigrationTestUtils.cleanup();
    
    // Reset current config
    this.currentConfig = {};
  }
}

/**
 * Vitest-specific testing utilities
 */
export class VitestUtils {
  /**
   * Create a mock function with type safety
   */
  static mockFn<T extends (...args: any[]) => any>(
    implementation?: T
  ): Mock<Parameters<T>, ReturnType<T>> {
    return vi.fn(implementation);
  }

  /**
   * Set up beforeEach hook with automatic cleanup
   */
  static setupAutoCleanup(): void {
    // This would be called in test files
    beforeEach(() => {
      TestEnvironment.cleanup();
    });

    afterEach(() => {
      TestEnvironment.cleanup();
    });
  }

  /**
   * Mock a service method with specific return value
   */
  static mockServiceMethod<
    TService extends keyof ServiceContainer,
    TMethod extends keyof NonNullable<ServiceContainer[TService]>
  >(
    service: TService,
    method: TMethod,
    returnValue: any,
    implementation?: (...args: any[]) => any
  ): Mock {
    const container = TestEnvironment.getServiceContainer();
    const serviceInstance = container[service];
    
    if (!serviceInstance) {
      throw new Error(`Service ${String(service)} not available in test container`);
    }

    const mockFn = vi.fn(implementation || (() => returnValue));
    (serviceInstance as any)[method] = mockFn;
    
    return mockFn;
  }
}

/**
 * Route handler testing utilities
 */
export class RouteTestUtils {
  /**
   * Create a test route handler factory with mock services
   */
  static createTestRouteHandlerFactory(mockServices: Partial<ServiceContainer> = {}) {
    const container = TestEnvironment.setupWithDependencyInjection(mockServices);
    
    // Import the route handler factory
    const { RouteHandlerFactory } = require('@/lib/api/route-helpers-v2');
    return new RouteHandlerFactory(container);
  }

  /**
   * Mock the service container for existing route handlers
   */
  static mockServiceContainer(mockServices: Partial<ServiceContainer> = {}): void {
    // Mock the getServiceContainer function
    vi.mock('@/lib/config/service-container', () => ({
      getServiceContainer: vi.fn().mockReturnValue(
        MockServiceFactory.createServiceContainer(mockServices)
      ),
    }));
  }

  /**
   * Create a mock request object for testing
   */
  static createMockRequest(options: {
    method?: string;
    url?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {}): Request {
    const {
      method = 'GET',
      url = 'http://localhost/api/test',
      body,
      headers = {}
    } = options;

    return new Request(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

/**
 * Integration test utilities
 */
export class IntegrationTestUtils {
  /**
   * Set up integration test with real adapters but mock external services
   */
  static setupIntegrationTest(config: {
    mockExternalServices?: string[];
    useRealDatabase?: boolean;
    mockProviders?: Record<string, any>;
  } = {}): ServiceContainer {
    const { mockExternalServices = [], mockProviders = {} } = config;

    // Create real adapter registry
    const registry = AdapterRegistry.getInstance();
    
    // Register mock providers for external services
    mockExternalServices.forEach(serviceName => {
      if (!mockProviders[serviceName]) {
        mockProviders[serviceName] = vi.fn();
      }
      registry.registerAdapter(serviceName, mockProviders[serviceName]);
    });

    return TestEnvironment.setupWithDependencyInjection({}, mockProviders);
  }
}

// Export convenience functions for common test scenarios
export {
  MockServiceFactory as Mocks,
  TestEnvironment as TestEnv,
  VitestUtils as Vitest,
  RouteTestUtils as RouteTest,
  IntegrationTestUtils as IntegrationTest,
};