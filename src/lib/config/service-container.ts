/**
 * Service Container
 * 
 * This file provides a centralized service container that manages service instances
 * and allows host applications to override service implementations while maintaining
 * type safety and providing sensible defaults.
 */

import type { 
  ServiceContainer, 
  ServiceConfig, 
  UserManagementConfig 
} from '@/core/config/interfaces';
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
import type { AddressService } from '@/core/address/interfaces';
import type { ResourceRelationshipService } from '@/core/resource-relationship/interfaces';
import type { OAuthService } from '@/core/oauth/interfaces';

// Import existing service factories
import { getApiAuthService } from '@/services/auth/factory';
import { getApiUserService } from '@/services/user/factory';
import { getApiPermissionService } from '@/services/permission/factory';
import { getApiTeamService } from '@/services/team/factory';
import { getApiSsoService } from '@/services/sso/factory';
import { getApiTwoFactorService } from '@/services/two-factor/factory';
import { getApiSubscriptionService } from '@/services/subscription/factory';
// ApiKey and GDPR services are constructed directly to avoid circular deps
import type { IApiKeyDataProvider } from '@/core/api-keys';
import type { IGdprDataProvider } from '@/core/gdpr';
import { AdapterRegistry } from '@/adapters/registry';
import { DefaultApiKeysService } from '@/services/api-keys/default-api-keys.service';
import { DefaultGdprService } from '@/services/gdpr/default-gdpr.service';
import { getApiNotificationService } from '@/services/notification/factory';
import { getApiWebhookService } from '@/services/webhooks/factory';
import { getApiSessionService } from '@/services/session/factory';
import { getApiOrganizationService } from '@/services/organization/factory';
import { getApiCsrfService } from '@/services/csrf/factory';
import { getApiConsentService } from '@/services/consent/factory';
import { getApiAuditService } from '@/services/audit/factory';
import { getApiAdminService } from '@/services/admin/factory';
import { getApiRoleService } from '@/services/role/factory';
import { getApiAddressService } from '@/services/address/factory';
import { getApiResourceRelationshipService } from '@/services/resource-relationship/factory';
import { getApiCompanyNotificationService } from '@/services/company-notification/factory';
import { getApiOAuthService } from '@/services/oauth/factory';

// TODO: Import additional service factories as they become available
// import { getApiRoleService } from '@/services/role/factory';
// import { getApiAddressService } from '@/services/address/factory';

/**
 * Global service configuration
 */
let globalServiceConfig: ServiceConfig = {};

/**
 * Cached service instances
 */
let serviceInstances: Partial<ServiceContainer> = {};

/**
 * Configure services globally for the entire application
 * This allows host applications to override service implementations
 */
export function configureServices(config: ServiceConfig): void {
  globalServiceConfig = { ...globalServiceConfig, ...config };
  
  // Clear cached instances so they get recreated with new config
  serviceInstances = {};
}

/**
 * Configure the entire User Management module
 * This is the main entry point for host applications
 */
export function configureUserManagement(config: UserManagementConfig): void {
  if (config.services) {
    configureServices(config.services);
  }
  
  // TODO: Handle feature flags and API configuration
  // This will be expanded in future steps
}

/**
 * Get a configured service container with all services
 * Uses global configuration and caches instances for performance
 */
export function getServiceContainer(overrides?: Partial<ServiceContainer>): ServiceContainer {
  // Create auth service if not cached
  if (!serviceInstances.auth) {
    serviceInstances.auth = globalServiceConfig.authService || getApiAuthService();
  }
  
  // Create user service if not cached
  if (!serviceInstances.user) {
    serviceInstances.user = globalServiceConfig.userService || getApiUserService();
  }
  
  // Create permission service if not cached
  if (!serviceInstances.permission && (globalServiceConfig.permissionService || globalServiceConfig.featureFlags?.permissions !== false)) {
    serviceInstances.permission = globalServiceConfig.permissionService || getApiPermissionService();
  }
  
  // Create team service if not cached
  if (!serviceInstances.team && globalServiceConfig.teamService) {
    serviceInstances.team = globalServiceConfig.teamService;
  } else if (!serviceInstances.team && globalServiceConfig.featureFlags?.teams !== false) {
    serviceInstances.team = getApiTeamService();
  }
  
  // Create SSO service if not cached
  if (!serviceInstances.sso && globalServiceConfig.ssoService) {
    serviceInstances.sso = globalServiceConfig.ssoService;
  } else if (!serviceInstances.sso && globalServiceConfig.featureFlags?.sso !== false) {
    serviceInstances.sso = getApiSsoService();
  }
  
  // Create GDPR service if not cached
  if (!serviceInstances.gdpr && globalServiceConfig.gdprService) {
    serviceInstances.gdpr = globalServiceConfig.gdprService;
  } else if (!serviceInstances.gdpr && globalServiceConfig.featureFlags?.gdpr !== false) {
    const provider = AdapterRegistry.getInstance().getAdapter<IGdprDataProvider>('gdpr');
    serviceInstances.gdpr = new DefaultGdprService(provider);
  }
  
  // Create two-factor service if not cached
  if (!serviceInstances.twoFactor && globalServiceConfig.twoFactorService) {
    serviceInstances.twoFactor = globalServiceConfig.twoFactorService;
  } else if (!serviceInstances.twoFactor && globalServiceConfig.featureFlags?.twoFactor !== false) {
    serviceInstances.twoFactor = getApiTwoFactorService();
  }
  
  // Create subscription service if not cached
  if (!serviceInstances.subscription && globalServiceConfig.subscriptionService) {
    serviceInstances.subscription = globalServiceConfig.subscriptionService;
  } else if (!serviceInstances.subscription && globalServiceConfig.featureFlags?.subscription !== false) {
    serviceInstances.subscription = getApiSubscriptionService();
  }
  
  // Create API key service if not cached
  if (!serviceInstances.apiKey && globalServiceConfig.apiKeyService) {
    serviceInstances.apiKey = globalServiceConfig.apiKeyService;
  } else if (!serviceInstances.apiKey && globalServiceConfig.featureFlags?.apiKeys !== false) {
    const provider = AdapterRegistry.getInstance().getAdapter<IApiKeyDataProvider>('apiKey');
    serviceInstances.apiKey = new DefaultApiKeysService(provider);
  }
  
  // Create notification service if not cached
  if (!serviceInstances.notification && globalServiceConfig.notificationService) {
    serviceInstances.notification = globalServiceConfig.notificationService;
  } else if (!serviceInstances.notification && globalServiceConfig.featureFlags?.notifications !== false) {
    serviceInstances.notification = getApiNotificationService();
  }
  
  // Create webhook service if not cached
  if (!serviceInstances.webhook && globalServiceConfig.webhookService) {
    serviceInstances.webhook = globalServiceConfig.webhookService;
  } else if (!serviceInstances.webhook && globalServiceConfig.featureFlags?.webhooks !== false) {
    serviceInstances.webhook = getApiWebhookService();
  }
  
  // Create session service if not cached
  if (!serviceInstances.session && globalServiceConfig.sessionService) {
    serviceInstances.session = globalServiceConfig.sessionService;
  } else if (!serviceInstances.session && globalServiceConfig.featureFlags?.sessions !== false) {
    serviceInstances.session = getApiSessionService();
  }
  
  // Create organization service if not cached
  if (!serviceInstances.organization && globalServiceConfig.organizationService) {
    serviceInstances.organization = globalServiceConfig.organizationService;
  } else if (!serviceInstances.organization && globalServiceConfig.featureFlags?.organizations !== false) {
    serviceInstances.organization = getApiOrganizationService();
  }
  
  // Create CSRF service if not cached
  if (!serviceInstances.csrf && globalServiceConfig.csrfService) {
    serviceInstances.csrf = globalServiceConfig.csrfService;
  } else if (!serviceInstances.csrf && globalServiceConfig.featureFlags?.csrf !== false) {
    serviceInstances.csrf = getApiCsrfService();
  }
  
  // Create consent service if not cached
  if (!serviceInstances.consent && globalServiceConfig.consentService) {
    serviceInstances.consent = globalServiceConfig.consentService;
  } else if (!serviceInstances.consent && globalServiceConfig.featureFlags?.consent !== false) {
    serviceInstances.consent = getApiConsentService();
  }
  
  // Create audit service if not cached
  if (!serviceInstances.audit && globalServiceConfig.auditService) {
    serviceInstances.audit = globalServiceConfig.auditService;
  } else if (!serviceInstances.audit && globalServiceConfig.featureFlags?.audit !== false) {
    serviceInstances.audit = getApiAuditService();
  }
  
  // Create admin service if not cached
  if (!serviceInstances.admin && globalServiceConfig.adminService) {
    serviceInstances.admin = globalServiceConfig.adminService;
  } else if (!serviceInstances.admin && globalServiceConfig.featureFlags?.admin !== false) {
    serviceInstances.admin = getApiAdminService();
  }
  
  // Create role service if not cached
  if (!serviceInstances.role && globalServiceConfig.roleService) {
    serviceInstances.role = globalServiceConfig.roleService;
  } else if (!serviceInstances.role && globalServiceConfig.featureFlags?.roles !== false) {
    serviceInstances.role = getApiRoleService();
  }
  
  // Create address service if not cached
  if (!serviceInstances.address && globalServiceConfig.addressService) {
    serviceInstances.address = globalServiceConfig.addressService;
  } else if (!serviceInstances.address && globalServiceConfig.featureFlags?.addresses !== false) {
    serviceInstances.address = getApiAddressService();
  }

  // Create OAuth service if not cached
  if (!serviceInstances.oauth && globalServiceConfig.oauthService) {
    serviceInstances.oauth = globalServiceConfig.oauthService;
  } else if (!serviceInstances.oauth && globalServiceConfig.featureFlags?.oauth !== false) {
    serviceInstances.oauth = getApiOAuthService();
  }

  // Create company notification service if not cached
  if (!serviceInstances.companyNotification && globalServiceConfig.companyNotificationService) {
    serviceInstances.companyNotification = globalServiceConfig.companyNotificationService;
  } else if (!serviceInstances.companyNotification) {
    serviceInstances.companyNotification = getApiCompanyNotificationService();
  }
  
  // Create resource relationship service if not cached
  if (!serviceInstances.resourceRelationship && globalServiceConfig.resourceRelationshipService) {
    serviceInstances.resourceRelationship = globalServiceConfig.resourceRelationshipService;
  } else if (!serviceInstances.resourceRelationship) {
    serviceInstances.resourceRelationship = getApiResourceRelationshipService();
  }
  
  // TODO: Add other services as their factories become available
  
  // Return container with any provided overrides
  return {
    auth: overrides?.auth || serviceInstances.auth!,
    user: overrides?.user || serviceInstances.user!,
    permission: overrides?.permission || serviceInstances.permission,
    team: overrides?.team || serviceInstances.team,
    sso: overrides?.sso || serviceInstances.sso,
    gdpr: overrides?.gdpr || serviceInstances.gdpr,
    twoFactor: overrides?.twoFactor || serviceInstances.twoFactor,
    subscription: overrides?.subscription || serviceInstances.subscription,
    apiKey: overrides?.apiKey || serviceInstances.apiKey,
    notification: overrides?.notification || serviceInstances.notification,
    webhook: overrides?.webhook || serviceInstances.webhook,
    session: overrides?.session || serviceInstances.session,
    organization: overrides?.organization || serviceInstances.organization,
    csrf: overrides?.csrf || serviceInstances.csrf,
    consent: overrides?.consent || serviceInstances.consent,
    audit: overrides?.audit || serviceInstances.audit,
    admin: overrides?.admin || serviceInstances.admin,
    role: overrides?.role || serviceInstances.role,
    address: overrides?.address || serviceInstances.address,
    oauth: overrides?.oauth || serviceInstances.oauth,
    companyNotification: overrides?.companyNotification || serviceInstances.companyNotification,
    resourceRelationship: overrides?.resourceRelationship || serviceInstances.resourceRelationship,
  };
}

/**
 * Get a specific service with fallback to global configuration
 */
export function getConfiguredAuthService(override?: AuthService): AuthService {
  return override || globalServiceConfig.authService || getApiAuthService();
}

/**
 * Get a specific service with fallback to global configuration
 */
export function getConfiguredUserService(override?: UserService): UserService {
  return override || globalServiceConfig.userService || getApiUserService();
}

/**
 * Get a specific service with fallback to global configuration
 */
export function getConfiguredPermissionService(override?: PermissionService): PermissionService | undefined {
  return override || globalServiceConfig.permissionService || getApiPermissionService();
}

/**
 * Get a specific service with fallback to global configuration
 */
export function getConfiguredTeamService(override?: TeamService): TeamService | undefined {
  return override || globalServiceConfig.teamService || getApiTeamService();
}

/**
 * Get a specific service with fallback to global configuration
 */
export function getConfiguredSsoService(override?: SsoService): SsoService | undefined {
  return override || globalServiceConfig.ssoService || getApiSsoService();
}

/**
 * Get a specific service with fallback to global configuration
 */
export function getConfiguredGdprService(override?: GdprService): GdprService | undefined {
  if (override) return override;
  if (globalServiceConfig.gdprService) return globalServiceConfig.gdprService;
  const provider = AdapterRegistry.getInstance().getAdapter<IGdprDataProvider>('gdpr');
  return new DefaultGdprService(provider);
}

/**
 * Get a specific service with fallback to global configuration
 */
export function getConfiguredTwoFactorService(override?: TwoFactorService): TwoFactorService | undefined {
  return override || globalServiceConfig.twoFactorService || getApiTwoFactorService();
}

/**
 * Get a specific service with fallback to global configuration
 */
export function getConfiguredSubscriptionService(override?: SubscriptionService): SubscriptionService | undefined {
  return override || globalServiceConfig.subscriptionService || getApiSubscriptionService();
}

/**
 * Get a specific service with fallback to global configuration
 */
export function getConfiguredApiKeyService(override?: ApiKeyService): ApiKeyService | undefined {
  if (override) return override;
  if (globalServiceConfig.apiKeyService) return globalServiceConfig.apiKeyService;
  const provider = AdapterRegistry.getInstance().getAdapter<IApiKeyDataProvider>('apiKey');
  return new DefaultApiKeysService(provider);
}

/**
 * Get a specific service with fallback to global configuration
 */
export function getConfiguredNotificationService(override?: NotificationService): NotificationService | undefined {
  return override || globalServiceConfig.notificationService || getApiNotificationService();
}

/**
 * Get a specific service with fallback to global configuration
 */
export function getConfiguredWebhookService(override?: IWebhookService): IWebhookService | undefined {
  return override || globalServiceConfig.webhookService || getApiWebhookService();
}

/**
 * Get a specific service with fallback to global configuration
 */
export function getConfiguredSessionService(override?: SessionService): SessionService | undefined {
  return override || globalServiceConfig.sessionService || getApiSessionService();
}

/**
 * Get a specific service with fallback to global configuration
 */
export function getConfiguredOrganizationService(override?: OrganizationService): OrganizationService | undefined {
  return override || globalServiceConfig.organizationService || getApiOrganizationService();
}

/**
 * Get a specific service with fallback to global configuration
 */
export function getConfiguredCsrfService(override?: CsrfService): CsrfService | undefined {
  return override || globalServiceConfig.csrfService || getApiCsrfService();
}

/**
 * Get a specific service with fallback to global configuration
 */
export function getConfiguredConsentService(override?: ConsentService): ConsentService | undefined {
  return override || globalServiceConfig.consentService || getApiConsentService();
}

/**
 * Get a specific service with fallback to global configuration
 */
export function getConfiguredAuditService(override?: AuditService): AuditService | undefined {
  return override || globalServiceConfig.auditService || getApiAuditService();
}

/**
 * Get a specific service with fallback to global configuration
 */
export function getConfiguredAdminService(override?: AdminService): AdminService | undefined {
  return override || globalServiceConfig.adminService || getApiAdminService();
}

/**
 * Get a specific service with fallback to global configuration
 */
export function getConfiguredRoleService(override?: RoleService): RoleService | undefined {
  return override || globalServiceConfig.roleService || getApiRoleService();
}

/**
 * Get a specific service with fallback to global configuration
 */
export function getConfiguredAddressService(override?: AddressService): AddressService | undefined {
  return override || globalServiceConfig.addressService || getApiAddressService();
}

/**
 * Get a specific service with fallback to global configuration
 */
export function getConfiguredOAuthService(override?: OAuthService): OAuthService | undefined {
  return override || globalServiceConfig.oauthService || getApiOAuthService();
}

/**
 * Get a specific service with fallback to global configuration
 */
export function getConfiguredCompanyNotificationService(override?: import("@/core/company-notification/interfaces").CompanyNotificationService): import("@/core/company-notification/interfaces").CompanyNotificationService {
  return override || globalServiceConfig.companyNotificationService || getApiCompanyNotificationService();
}

/**
 * Get a specific service with fallback to global configuration
 */
export function getConfiguredResourceRelationshipService(override?: ResourceRelationshipService): ResourceRelationshipService | undefined {
  return override || globalServiceConfig.resourceRelationshipService || getApiResourceRelationshipService();
}

/**
 * Reset all cached service instances
 * Useful for testing or when configuration changes
 */
export function resetServiceContainer(): void {
  serviceInstances = {};
  globalServiceConfig = {};
}

/**
 * Get current service configuration (read-only)
 */
export function getServiceConfiguration(): Readonly<ServiceConfig> {
  return { ...globalServiceConfig };
} 