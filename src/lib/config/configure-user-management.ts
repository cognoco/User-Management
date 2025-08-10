/**
 * Centralized User Management Configuration Factory
 * 
 * This is the single entry point for configuring all user management services.
 * It eliminates circular dependencies by using pure dependency injection
 * and provides a clean testing interface.
 * 
 * Key principles:
 * 1. Pure function - no circular references to service container
 * 2. Explicit dependency injection - all dependencies passed explicitly
 * 3. Type-safe configuration - full TypeScript support
 * 4. Testable - easy to mock dependencies for testing
 */

import type { 
  ServiceContainer, 
  ServiceConfig, 
  UserManagementConfig 
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

// Pure service factory functions (no circular dependencies)
import { createAuthService } from '@/services/auth/pure-factory';
import { createUserService } from '@/services/user/pure-factory';
import { createPermissionService } from '@/services/permission/pure-factory';
import { createTeamService } from '@/services/team/pure-factory';
import { createSsoService } from '@/services/sso/pure-factory';
import { createGdprService } from '@/services/gdpr/pure-factory';
import { createTwoFactorService } from '@/services/two-factor/pure-factory';
import { createSubscriptionService } from '@/services/subscription/pure-factory';
import { createApiKeyService } from '@/services/api-keys/pure-factory';
import { createNotificationService } from '@/services/notification/pure-factory';
import { createWebhookService } from '@/services/webhooks/pure-factory';
import { createSessionService } from '@/services/session/pure-factory';
import { createOrganizationService } from '@/services/organization/pure-factory';
import { createCsrfService } from '@/services/csrf/pure-factory';
import { createConsentService } from '@/services/consent/pure-factory';
import { createAuditService } from '@/services/audit/pure-factory';
import { createAdminService } from '@/services/admin/pure-factory';
import { createRoleService } from '@/services/role/pure-factory';
import { createAddressService } from '@/services/address/pure-factory';
import { createResourceRelationshipService } from '@/services/resource-relationship/pure-factory';
import { createOAuthService } from '@/services/oauth/pure-factory';
import { createCompanyNotificationService } from '@/services/company-notification/pure-factory';

// Adapter registry for data providers
import { AdapterRegistry } from '@/adapters/registry';

/**
 * Service creation dependencies that can be injected for testing
 */
export interface ServiceDependencies {
  adapterRegistry?: AdapterRegistry;
  // Add other external dependencies as needed
}

/**
 * Feature flags for enabling/disabling services
 */
export interface FeatureFlags {
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
}

/**
 * Configuration for the user management system
 */
export interface UserManagementConfiguration {
  // Service overrides
  services?: Partial<ServiceContainer>;
  
  // Feature flags
  featureFlags?: FeatureFlags;
  
  // Dependencies for testing
  dependencies?: ServiceDependencies;
}

/**
 * Create a complete service container with all user management services
 * 
 * This is a pure function with no circular dependencies or global state.
 * All dependencies are explicitly passed in, making testing simple.
 * 
 * @param config Configuration and overrides
 * @returns Complete service container
 */
export function configureUserManagement(
  config: UserManagementConfiguration = {}
): ServiceContainer {
  const {
    services = {},
    featureFlags = {},
    dependencies = {}
  } = config;

  // Get adapter registry (or use injected one for testing)
  const adapterRegistry = dependencies.adapterRegistry || AdapterRegistry.getInstance();

  // Create services with explicit dependencies
  // Each factory function is pure and takes its dependencies explicitly
  
  const auth: AuthService = services.auth || createAuthService({
    adapterRegistry
  });

  const user: UserService = services.user || createUserService({
    adapterRegistry,
    authService: auth
  });

  const permission: PermissionService | undefined = 
    services.permission || 
    (featureFlags.permissions !== false ? createPermissionService({
      adapterRegistry,
      authService: auth
    }) : undefined);

  const team: TeamService | undefined = 
    services.team ||
    (featureFlags.teams !== false ? createTeamService({
      adapterRegistry,
      authService: auth,
      userService: user,
      permissionService: permission
    }) : undefined);

  const sso: SsoService | undefined = 
    services.sso ||
    (featureFlags.sso !== false ? createSsoService({
      adapterRegistry,
      authService: auth
    }) : undefined);

  const gdpr: GdprService | undefined = 
    services.gdpr ||
    (featureFlags.gdpr !== false ? createGdprService({
      adapterRegistry,
      userService: user
    }) : undefined);

  const twoFactor: TwoFactorService | undefined = 
    services.twoFactor ||
    (featureFlags.twoFactor !== false ? createTwoFactorService({
      adapterRegistry,
      authService: auth
    }) : undefined);

  const subscription: SubscriptionService | undefined = 
    services.subscription ||
    (featureFlags.subscription !== false ? createSubscriptionService({
      adapterRegistry,
      userService: user
    }) : undefined);

  const apiKey: ApiKeyService | undefined = 
    services.apiKey ||
    (featureFlags.apiKeys !== false ? createApiKeyService({
      adapterRegistry,
      authService: auth
    }) : undefined);

  const notification: NotificationService | undefined = 
    services.notification ||
    (featureFlags.notifications !== false ? createNotificationService({
      adapterRegistry,
      userService: user
    }) : undefined);

  const webhook: IWebhookService | undefined = 
    services.webhook ||
    (featureFlags.webhooks !== false ? createWebhookService({
      adapterRegistry
    }) : undefined);

  const session: SessionService | undefined = 
    services.session ||
    (featureFlags.sessions !== false ? createSessionService({
      adapterRegistry,
      authService: auth
    }) : undefined);

  const organization: OrganizationService | undefined = 
    services.organization ||
    (featureFlags.organizations !== false ? createOrganizationService({
      adapterRegistry,
      userService: user,
      teamService: team
    }) : undefined);

  const csrf: CsrfService | undefined = 
    services.csrf ||
    (featureFlags.csrf !== false ? createCsrfService({
      adapterRegistry
    }) : undefined);

  const consent: ConsentService | undefined = 
    services.consent ||
    (featureFlags.consent !== false ? createConsentService({
      adapterRegistry,
      userService: user
    }) : undefined);

  const audit: AuditService | undefined = 
    services.audit ||
    (featureFlags.audit !== false ? createAuditService({
      adapterRegistry,
      authService: auth
    }) : undefined);

  const admin: AdminService | undefined = 
    services.admin ||
    (featureFlags.admin !== false ? createAdminService({
      adapterRegistry,
      authService: auth,
      userService: user,
      permissionService: permission
    }) : undefined);

  const role: RoleService | undefined = 
    services.role ||
    (featureFlags.roles !== false ? createRoleService({
      adapterRegistry,
      authService: auth,
      permissionService: permission
    }) : undefined);

  const address: CompanyAddressService | undefined = 
    services.address ||
    (featureFlags.addresses !== false ? createAddressService({
      adapterRegistry
    }) : undefined);

  const oauth: OAuthService | undefined = 
    services.oauth ||
    (featureFlags.oauth !== false ? createOAuthService({
      adapterRegistry,
      authService: auth
    }) : undefined);

  const companyNotification: CompanyNotificationService = 
    services.companyNotification || createCompanyNotificationService({
      adapterRegistry,
      notificationService: notification
    });

  const resourceRelationship: ResourceRelationshipService | undefined = 
    services.resourceRelationship || createResourceRelationshipService({
      adapterRegistry
    });

  // Return the complete service container
  return {
    auth,
    user,
    permission,
    team,
    sso,
    gdpr,
    twoFactor,
    subscription,
    apiKey,
    notification,
    webhook,
    session,
    organization,
    csrf,
    consent,
    audit,
    admin,
    role,
    address,
    oauth,
    companyNotification,
    resourceRelationship,
  };
}

/**
 * Create a minimal service container for testing with only required services
 */
export function createMinimalServices(overrides: Partial<ServiceContainer> = {}): ServiceContainer {
  return configureUserManagement({
    services: overrides,
    // Disable optional services by default for testing
    featureFlags: {
      permissions: false,
      teams: false,
      sso: false,
      gdpr: false,
      twoFactor: false,
      subscription: false,
      apiKeys: false,
      notifications: false,
      webhooks: false,
      sessions: false,
      organizations: false,
      csrf: false,
      consent: false,
      audit: false,
      admin: false,
      roles: false,
      addresses: false,
      oauth: false,
    }
  });
}