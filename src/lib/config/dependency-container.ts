/**
 * Pure Dependency Injection Container
 * 
 * This container eliminates circular dependencies by:
 * 1. Creating all services in the correct dependency order
 * 2. Using pure factory functions with explicit dependencies
 * 3. Providing a registry for adapter lookup
 * 4. Supporting both real and mock implementations
 * 
 * Key principles:
 * - No service calls getServiceContainer() or other services during creation
 * - All dependencies are explicitly passed to constructors
 * - Services are created once in topological order
 * - Easy to test with dependency injection
 */

import type { 
  ServiceContainer, 
  UserManagementConfig,
  AuthContext
} from '@/core/config/interfaces';

// Core service interfaces
import type { AuthService } from '@/core/auth/interfaces';
import type { UserService } from '@/core/user/interfaces';
import type { PermissionService } from '@/core/permission/interfaces';
import type { TeamService } from '@/core/team/interfaces';
import type { SsoService } from '@/core/sso/interfaces';
import type { GdprService } from '@/core/gdpr/interfaces';
import type { TwoFactorService } from '@/core/two-factor/interfaces';
import type { SubscriptionService } from '@/core/subscription/interfaces';
import type { ApiKeyService } from '@/core/api-keys/interfaces';
import type { NotificationService } from '@/core/notification/interfaces';
import type { IWebhookService } from '@/core/webhooks/interfaces';
import type { SessionService } from '@/core/session/interfaces';
import type { OrganizationService } from '@/core/organization/interfaces';
import type { CsrfService } from '@/core/csrf/interfaces';
import type { ConsentService } from '@/core/consent/interfaces';
import type { AuditService } from '@/core/audit/interfaces';
import type { AdminService } from '@/core/admin/interfaces';
import type { RoleService } from '@/core/role/interfaces';
import type { CompanyAddressService } from '@/core/address/interfaces';
import type { ResourceRelationshipService } from '@/core/resource-relationship/interfaces';
import type { OAuthService } from '@/core/oauth/interfaces';
import type { CompanyNotificationService } from '@/core/company-notification/interfaces';

// Data provider interfaces
import type { AuthDataProvider } from '@/adapters/auth/interfaces';
import type { UserDataProvider } from '@/core/user/IUserDataProvider';
import type { PermissionDataProvider } from '@/core/permission/IPermissionDataProvider';
// ... other data providers

// Pure service implementations (no dependencies on containers)
import { DefaultAuthService } from '@/services/auth/default-auth.service';
import { DefaultUserService } from '@/services/user/default-user.service';
// ... other service implementations

// Adapter registry for data provider lookup
import { AdapterRegistry } from '@/adapters/registry';

/**
 * Configuration for dependency injection
 */
export interface DependencyConfig {
  // Service overrides for testing
  services?: Partial<ServiceContainer>;
  
  // Data provider overrides for testing
  providers?: Record<string, any>;
  
  // Feature flags
  features?: {
    permissions?: boolean;
    teams?: boolean;
    sso?: boolean;
    gdpr?: boolean;
    twoFactor?: boolean;
    subscription?: boolean;
    apiKeys?: boolean;
    notifications?: boolean;
    webhooks?: boolean;
    sessions?: boolean;
    organizations?: boolean;
    csrf?: boolean;
    consent?: boolean;
    audit?: boolean;
    admin?: boolean;
    roles?: boolean;
    addresses?: boolean;
    oauth?: boolean;
  };
  
  // Environment config
  environment?: {
    supabaseUrl?: string;
    supabaseKey?: string;
    // ... other env vars
  };
}

/**
 * Pure Dependency Injection Container
 * 
 * Creates services in correct dependency order with no circular references.
 * All dependencies are resolved and injected explicitly.
 */
export class DependencyContainer {
  private services: Partial<ServiceContainer> = {};
  private providers: Record<string, any> = {};
  private config: DependencyConfig;
  
  constructor(config: DependencyConfig = {}) {
    this.config = config;
  }

  /**
   * Get or create a service container with all dependencies resolved
   */
  getServiceContainer(): ServiceContainer {
    // Use the new pure factory instead of manual initialization
    const { createApiServices } = require('@/lib/services/factory');
    
    if (!this.services.auth) {
      this.services = createApiServices({
        services: this.config.services,
        featureFlags: this.config.features,
        env: this.config.environment,
        providers: this.config.providers
      });
    }
    
    return this.services as ServiceContainer;
  }

  /**
   * Initialize all services in dependency order
   */
  private initializeServices(): void {
    // 1. Initialize data providers first (no dependencies)
    this.initializeProviders();
    
    // 2. Create core services (Level 0 - minimal dependencies)
    this.createAuthService();
    this.createSessionService();
    this.createCsrfService();
    
    // 3. Create user service (Level 1 - depends on auth)
    this.createUserService();
    
    // 4. Create permission service (Level 1 - depends on auth)
    this.createPermissionService();
    
    // 5. Create services with multiple dependencies (Level 2+)
    this.createTeamService();
    this.createSsoService();
    this.createGdprService();
    this.createTwoFactorService();
    this.createSubscriptionService();
    this.createApiKeyService();
    this.createNotificationService();
    this.createWebhookService();
    this.createOrganizationService();
    this.createConsentService();
    this.createAuditService();
    this.createAdminService();
    this.createRoleService();
    this.createAddressService();
    this.createOAuthService();
    this.createCompanyNotificationService();
    this.createResourceRelationshipService();
  }

  /**
   * Initialize data providers from registry or environment
   */
  private initializeProviders(): void {
    const registry = AdapterRegistry.getInstance();
    
    // Get auth provider
    if (!this.providers.auth) {
      try {
        this.providers.auth = registry.getAdapter<AuthDataProvider>('auth');
      } catch {
        // Create from environment if not in registry
        this.providers.auth = this.createAuthProviderFromEnv();
      }
    }
    
    // Get other providers similarly...
    // This avoids the circular dependency by not calling service factories
  }

  /**
   * Create auth service with explicit dependencies
   */
  private createAuthService(): void {
    if (this.services.auth || this.config.services?.auth) {
      this.services.auth = this.config.services?.auth || this.services.auth;
      return;
    }

    const authProvider = this.providers.auth;
    if (!authProvider) {
      throw new Error('Auth provider not configured');
    }

    // Create auth service with explicit dependencies - no circular refs!
    this.services.auth = new DefaultAuthService(
      authProvider,
      // Pass any other dependencies explicitly
    );
  }

  /**
   * Create user service with auth dependency
   */
  private createUserService(): void {
    if (this.services.user || this.config.services?.user) {
      this.services.user = this.config.services?.user || this.services.user;
      return;
    }

    const userProvider = this.providers.user;
    const authService = this.services.auth!; // We know auth is created first

    this.services.user = new DefaultUserService(
      userProvider,
      authService // Explicit dependency injection
    );
  }

  /**
   * Create permission service with auth dependency
   */
  private createPermissionService(): void {
    if (!this.config.features?.permissions ?? true) {
      return; // Skip if disabled
    }
    
    if (this.services.permission || this.config.services?.permission) {
      this.services.permission = this.config.services?.permission || this.services.permission;
      return;
    }

    const permissionProvider = this.providers.permission;
    const authService = this.services.auth!;

    this.services.permission = new DefaultPermissionService(
      permissionProvider,
      authService
    );
  }

  /**
   * Create team service with multiple dependencies
   */
  private createTeamService(): void {
    if (!this.config.features?.teams ?? true) {
      return;
    }
    
    if (this.services.team || this.config.services?.team) {
      this.services.team = this.config.services?.team || this.services.team;
      return;
    }

    const teamProvider = this.providers.team;
    const authService = this.services.auth!;
    const userService = this.services.user!;
    const permissionService = this.services.permission;

    this.services.team = new DefaultTeamService(
      teamProvider,
      authService,
      userService,
      permissionService // Optional dependency
    );
  }

  // ... Continue with other services in dependency order

  private createAuthProviderFromEnv(): AuthDataProvider {
    const supabaseUrl = this.config.environment?.supabaseUrl || 
                       process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = this.config.environment?.supabaseKey ||
                       process.env.SUPABASE_SERVICE_ROLE_KEY ||
                       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration not found');
    }

    // Import and create provider without circular dependencies
    const { createSupabaseAuthProvider } = require('@/adapters/auth/factory');
    return createSupabaseAuthProvider(supabaseUrl, supabaseKey);
  }

  private isFullyInitialized(): boolean {
    return !!(this.services.auth && this.services.user);
  }

  // Additional create methods for other services...
  private createSessionService(): void {
    // Implementation similar to above
  }

  private createCsrfService(): void {
    // Implementation similar to above
  }

  // ... etc for all other services
}

/**
 * Create a dependency container with standard configuration
 */
export function createDependencyContainer(config?: DependencyConfig): DependencyContainer {
  return new DependencyContainer(config);
}

/**
 * Create a container configured for testing with mock services
 */
export function createTestContainer(
  mockServices: Partial<ServiceContainer> = {},
  mockProviders: Record<string, any> = {}
): DependencyContainer {
  return new DependencyContainer({
    services: mockServices,
    providers: mockProviders,
    features: {
      // Disable all optional features for testing by default
      permissions: false,
      teams: false,
      sso: false,
      // ... etc
    }
  });
}