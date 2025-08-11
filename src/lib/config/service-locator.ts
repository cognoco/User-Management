/**
 * Service Locator Pattern Implementation
 * 
 * This provides a clean way to access services without circular dependencies.
 * Services are registered once and retrieved by interface, supporting both
 * real implementations and mocks for testing.
 * 
 * Key benefits:
 * 1. No circular dependencies - services register themselves
 * 2. Type-safe service resolution with generics
 * 3. Easy testing - just register mock implementations
 * 4. Lazy initialization - services created only when needed
 * 5. Clear separation between service registration and usage
 */

import type { 
  ServiceContainer,
  AuthService,
  UserService,
  PermissionService,
  // ... other service interfaces
} from '@/core/config/interfaces';

/**
 * Service registration callback type
 */
type ServiceFactory<T> = () => T;
type ServiceInstance<T> = T | ServiceFactory<T>;

/**
 * Service locator registry
 */
export class ServiceLocator {
  private static instance: ServiceLocator | null = null;
  private services = new Map<string, any>();
  private singletons = new Map<string, any>();
  
  private constructor() {}

  /**
   * Get the global service locator instance
   */
  static getInstance(): ServiceLocator {
    if (!this.instance) {
      this.instance = new ServiceLocator();
    }
    return this.instance;
  }

  /**
   * Register a service implementation
   * 
   * @param key - Service identifier (use interface name)
   * @param implementation - Service instance or factory function
   * @param singleton - Whether to cache the instance (default: true)
   */
  register<T>(key: string, implementation: ServiceInstance<T>, singleton: boolean = true): void {
    this.services.set(key, { implementation, singleton });
  }

  /**
   * Get a service instance by key
   * 
   * @param key - Service identifier
   * @returns Service instance
   * @throws Error if service not registered
   */
  get<T>(key: string): T {
    const serviceInfo = this.services.get(key);
    if (!serviceInfo) {
      throw new Error(`Service '${key}' not registered in ServiceLocator`);
    }

    const { implementation, singleton } = serviceInfo;

    // Return cached singleton if available
    if (singleton && this.singletons.has(key)) {
      return this.singletons.get(key);
    }

    // Create instance (call factory if needed)
    const instance = typeof implementation === 'function' ? implementation() : implementation;

    // Cache if singleton
    if (singleton) {
      this.singletons.set(key, instance);
    }

    return instance;
  }

  /**
   * Check if a service is registered
   */
  has(key: string): boolean {
    return this.services.has(key);
  }

  /**
   * Clear all registrations (useful for testing)
   */
  clear(): void {
    this.services.clear();
    this.singletons.clear();
  }

  /**
   * Get all registered service keys
   */
  getRegisteredKeys(): string[] {
    return Array.from(this.services.keys());
  }
}

/**
 * Type-safe service identifiers
 * These act as both the key and type hint for TypeScript
 */
export const ServiceKeys = {
  AUTH_SERVICE: 'AuthService' as const,
  USER_SERVICE: 'UserService' as const,
  PERMISSION_SERVICE: 'PermissionService' as const,
  TEAM_SERVICE: 'TeamService' as const,
  SSO_SERVICE: 'SsoService' as const,
  GDPR_SERVICE: 'GdprService' as const,
  TWO_FACTOR_SERVICE: 'TwoFactorService' as const,
  SUBSCRIPTION_SERVICE: 'SubscriptionService' as const,
  API_KEY_SERVICE: 'ApiKeyService' as const,
  NOTIFICATION_SERVICE: 'NotificationService' as const,
  WEBHOOK_SERVICE: 'WebhookService' as const,
  SESSION_SERVICE: 'SessionService' as const,
  ORGANIZATION_SERVICE: 'OrganizationService' as const,
  CSRF_SERVICE: 'CsrfService' as const,
  CONSENT_SERVICE: 'ConsentService' as const,
  AUDIT_SERVICE: 'AuditService' as const,
  ADMIN_SERVICE: 'AdminService' as const,
  ROLE_SERVICE: 'RoleService' as const,
  ADDRESS_SERVICE: 'CompanyAddressService' as const,
  OAUTH_SERVICE: 'OAuthService' as const,
  COMPANY_SERVICE: 'CompanyService' as const,
  COMPANY_NOTIFICATION_SERVICE: 'CompanyNotificationService' as const,
  RESOURCE_RELATIONSHIP_SERVICE: 'ResourceRelationshipService' as const,
} as const;

/**
 * Type-safe service getter functions
 * These provide compile-time type checking
 */
export const Services = {
  auth: (): AuthService => ServiceLocator.getInstance().get(ServiceKeys.AUTH_SERVICE),
  user: (): UserService => ServiceLocator.getInstance().get(ServiceKeys.USER_SERVICE),
  permission: (): PermissionService | undefined => {
    const locator = ServiceLocator.getInstance();
    return locator.has(ServiceKeys.PERMISSION_SERVICE) 
      ? locator.get(ServiceKeys.PERMISSION_SERVICE) 
      : undefined;
  },
  // ... add other services as needed
};

/**
 * Initialize service locator with a service container
 * This bridges the new locator pattern with existing container
 */
export function initializeServiceLocator(container: ServiceContainer): void {
  const locator = ServiceLocator.getInstance();
  
  // Register all services from container
  locator.register(ServiceKeys.AUTH_SERVICE, container.auth);
  locator.register(ServiceKeys.USER_SERVICE, container.user);
  
  if (container.permission) {
    locator.register(ServiceKeys.PERMISSION_SERVICE, container.permission);
  }
  
  if (container.team) {
    locator.register(ServiceKeys.TEAM_SERVICE, container.team);
  }
  
  // ... register other services as needed
}

/**
 * Initialize service locator for testing with mock services
 */
export function initializeTestServiceLocator(mocks: Partial<ServiceContainer> = {}): void {
  const locator = ServiceLocator.getInstance();
  locator.clear(); // Clear any existing registrations
  
  // Register mock services
  if (mocks.auth) {
    locator.register(ServiceKeys.AUTH_SERVICE, mocks.auth);
  }
  
  if (mocks.user) {
    locator.register(ServiceKeys.USER_SERVICE, mocks.user);
  }
  
  if (mocks.permission) {
    locator.register(ServiceKeys.PERMISSION_SERVICE, mocks.permission);
  }
  
  // ... register other mocks as needed
}

/**
 * Utility to create a service container from the locator
 * This allows gradual migration from container to locator pattern
 */
export function createContainerFromLocator(): ServiceContainer {
  const locator = ServiceLocator.getInstance();
  
  return {
    auth: locator.get(ServiceKeys.AUTH_SERVICE),
    user: locator.get(ServiceKeys.USER_SERVICE),
    permission: locator.has(ServiceKeys.PERMISSION_SERVICE) 
      ? locator.get(ServiceKeys.PERMISSION_SERVICE) 
      : undefined,
    team: locator.has(ServiceKeys.TEAM_SERVICE) 
      ? locator.get(ServiceKeys.TEAM_SERVICE) 
      : undefined,
    // ... map other services
  } as ServiceContainer;
}