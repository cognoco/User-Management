/**
 * Pure Service Factory - Eliminates Circular Dependencies
 * 
 * This factory creates all services in explicit dependency order,
 * completely eliminating circular dependencies. Services are created
 * once with all their dependencies injected upfront.
 * 
 * Key improvements:
 * 1. No circular dependencies - services created in linear order
 * 2. Explicit dependency declaration - clear what each service needs
 * 3. Easy testing - inject mocks for any service
 * 4. No global state - pure functions throughout
 * 5. Type-safe - full TypeScript support
 */

import type { 
  ServiceContainer,
  ServiceConfig,
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

import { DefaultAuthService } from '@/services/auth/default-auth.service';
import { DefaultUserService } from '@/services/user/default-user.service';
import { DefaultPermissionService } from '@/services/permission/default-permission.service';
import { DefaultTeamService } from '@/services/team/default-team.service';
import { DefaultSsoService } from '@/services/sso/default-sso.service';
import { DefaultGdprService } from '@/services/gdpr/default-gdpr.service';
import { DefaultTwoFactorService } from '@/services/two-factor/default-two-factor.service';
import { DefaultSubscriptionService } from '@/services/subscription/default-subscription.service';
import { DefaultApiKeysService } from '@/services/api-keys/default-api-keys.service';
import { DefaultNotificationService } from '@/services/notification/default-notification.service';
import { DefaultSessionService } from '@/services/session/default-session.service';
import { DefaultOrganizationService } from '@/services/organization/default-organization.service';
import { DefaultCsrfService } from '@/services/csrf/default-csrf.service';
import { DefaultConsentService } from '@/services/consent/default-consent.service';
import { DefaultAuditService } from '@/services/audit/default-audit.service';
import { DefaultAdminService } from '@/services/admin/default-admin.service';
import { DefaultRoleService } from '@/services/role/default-role.service';
import { DefaultOAuthService } from '@/services/oauth/default-oauth.service';

import { AdapterRegistry } from '@/adapters/registry';
import { BrowserAuthStorage } from '@/services/auth/auth-storage';
import { createSupabaseAuthProvider } from '@/adapters/auth/factory';
import type { AuthDataProvider } from '@/adapters/auth/interfaces';
import type { UserDataProvider } from '@/adapters/user/interfaces';
import type { IPermissionDataProvider } from '@/core/permission';
import type { ITeamDataProvider } from '@/core/team';
import type { ISsoDataProvider } from '@/core/sso';
import type { IGdprDataProvider } from '@/core/gdpr';
import type { ITwoFactorDataProvider } from '@/core/two-factor';
import type { ISubscriptionDataProvider } from '@/core/subscription';
import type { IApiKeyDataProvider } from '@/core/api-keys';
import type { INotificationDataProvider } from '@/core/notification';
import type { ISessionDataProvider } from '@/core/session';
import type { IOrganizationDataProvider } from '@/core/organization';
import type { ICsrfDataProvider } from '@/core/csrf';
import type { IConsentDataProvider } from '@/core/consent';
import type { IAuditDataProvider } from '@/core/audit';
import type { IAdminDataProvider } from '@/core/admin';
import type { IRoleDataProvider } from '@/core/role';
import type { IOAuthProvider } from '@/core/oauth';

/**
 * Configuration for creating services
 */
export interface ServiceFactoryConfig {
  /** Override providers for specific services */
  providers?: {
    auth?: AuthDataProvider;
    user?: UserDataProvider;
    permission?: IPermissionDataProvider;
    team?: ITeamDataProvider;
    sso?: ISsoDataProvider;
    gdpr?: IGdprDataProvider;
    twoFactor?: ITwoFactorDataProvider;
    subscription?: ISubscriptionDataProvider;
    apiKey?: IApiKeyDataProvider;
    notification?: INotificationDataProvider;
    session?: ISessionDataProvider;
    organization?: IOrganizationDataProvider;
    csrf?: ICsrfDataProvider;
    consent?: IConsentDataProvider;
    audit?: IAuditDataProvider;
    admin?: IAdminDataProvider;
    role?: IRoleDataProvider;
    oauth?: IOAuthProvider;
  };
  
  /** Override specific service implementations */
  services?: Partial<ServiceContainer>;
  
  /** Feature flags to enable/disable services */
  featureFlags?: {
    permissions?: boolean;
    teams?: boolean;
    sso?: boolean;
    gdpr?: boolean;
    twoFactor?: boolean;
    subscription?: boolean;
    apiKeys?: boolean;
    notifications?: boolean;
    sessions?: boolean;
    organizations?: boolean;
    csrf?: boolean;
    consent?: boolean;
    audit?: boolean;
    admin?: boolean;
    roles?: boolean;
    oauth?: boolean;
  };
  
  /** Environment configuration */
  env?: {
    supabaseUrl?: string;
    supabaseKey?: string;
  };
}

/**
 * Get or create an auth provider
 */
function getAuthProvider(config: ServiceFactoryConfig): AuthDataProvider {
  if (config.providers?.auth) {
    return config.providers.auth;
  }
  
  // Try environment variables
  const supabaseUrl = config.env?.supabaseUrl || 
    process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.VITE_SUPABASE_URL;
    
  const supabaseKey = config.env?.supabaseKey ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;
  
  if (supabaseUrl && supabaseKey) {
    return createSupabaseAuthProvider(supabaseUrl, supabaseKey);
  }
  
  // Fall back to registry
  try {
    return AdapterRegistry.getInstance().getAdapter<AuthDataProvider>('auth');
  } catch {
    throw new Error(
      'Auth provider not configured. Provide a provider or set environment variables.'
    );
  }
}

/**
 * Get a data provider from registry or config
 */
function getProvider<T>(
  name: keyof NonNullable<ServiceFactoryConfig['providers']>,
  config: ServiceFactoryConfig
): T | undefined {
  const provider = config.providers?.[name];
  if (provider) return provider as T;
  
  try {
    return AdapterRegistry.getInstance().getAdapter<T>(name as string);
  } catch {
    return undefined;
  }
}

/**
 * Create all services with proper dependency injection
 * 
 * This is the main factory function that creates all services
 * in the correct dependency order, eliminating circular dependencies.
 * 
 * @param config Configuration for service creation
 * @returns Complete service container
 */
export function createApiServices(config: ServiceFactoryConfig = {}): ServiceContainer {
  // 1. Create core services first (no dependencies)
  const authService = config.services?.auth || (() => {
    const provider = getAuthProvider(config);
    const storage = new BrowserAuthStorage();
    return new DefaultAuthService(provider, storage);
  })();
  
  const userService = config.services?.user || (() => {
    const provider = getProvider<UserDataProvider>('user', config);
    if (!provider) throw new Error('User provider not configured');
    return new DefaultUserService(provider);
  })();
  
  // 2. Create services that depend on core services
  const permissionService = (config.featureFlags?.permissions !== false) 
    ? (config.services?.permission || (() => {
        const provider = getProvider<IPermissionDataProvider>('permission', config);
        if (!provider) return undefined;
        return new DefaultPermissionService(provider);
      })())
    : undefined;
  
  const teamService = (config.featureFlags?.teams !== false)
    ? (config.services?.team || (() => {
        const provider = getProvider<ITeamDataProvider>('team', config);
        if (!provider) return undefined;
        return new DefaultTeamService(provider);
      })())
    : undefined;
  
  const ssoService = (config.featureFlags?.sso !== false)
    ? (config.services?.sso || (() => {
        const provider = getProvider<ISsoDataProvider>('sso', config);
        if (!provider) return undefined;
        return new DefaultSsoService(provider);
      })())
    : undefined;
  
  const gdprService = (config.featureFlags?.gdpr !== false)
    ? (config.services?.gdpr || (() => {
        const provider = getProvider<IGdprDataProvider>('gdpr', config);
        if (!provider) return undefined;
        return new DefaultGdprService(provider);
      })())
    : undefined;
  
  const twoFactorService = (config.featureFlags?.twoFactor !== false)
    ? (config.services?.twoFactor || (() => {
        const provider = getProvider<ITwoFactorDataProvider>('twoFactor', config);
        if (!provider) return undefined;
        return new DefaultTwoFactorService(provider);
      })())
    : undefined;
  
  const subscriptionService = (config.featureFlags?.subscription !== false)
    ? (config.services?.subscription || (() => {
        const provider = getProvider<ISubscriptionDataProvider>('subscription', config);
        if (!provider) return undefined;
        return new DefaultSubscriptionService(provider);
      })())
    : undefined;
  
  const apiKeyService = (config.featureFlags?.apiKeys !== false)
    ? (config.services?.apiKey || (() => {
        const provider = getProvider<IApiKeyDataProvider>('apiKey', config);
        if (!provider) return undefined;
        return new DefaultApiKeysService(provider);
      })())
    : undefined;
  
  const notificationService = (config.featureFlags?.notifications !== false)
    ? (config.services?.notification || (() => {
        const provider = getProvider<INotificationDataProvider>('notification', config);
        if (!provider) return undefined;
        return new DefaultNotificationService(provider);
      })())
    : undefined;
  
  const sessionService = (config.featureFlags?.sessions !== false)
    ? (config.services?.session || (() => {
        const provider = getProvider<ISessionDataProvider>('session', config);
        if (!provider) return undefined;
        return new DefaultSessionService(provider);
      })())
    : undefined;
  
  const organizationService = (config.featureFlags?.organizations !== false)
    ? (config.services?.organization || (() => {
        const provider = getProvider<IOrganizationDataProvider>('organization', config);
        if (!provider) return undefined;
        return new DefaultOrganizationService(provider);
      })())
    : undefined;
  
  const csrfService = (config.featureFlags?.csrf !== false)
    ? (config.services?.csrf || (() => {
        const provider = getProvider<ICsrfDataProvider>('csrf', config);
        if (!provider) return undefined;
        return new DefaultCsrfService(provider);
      })())
    : undefined;
  
  const consentService = (config.featureFlags?.consent !== false)
    ? (config.services?.consent || (() => {
        const provider = getProvider<IConsentDataProvider>('consent', config);
        if (!provider) return undefined;
        return new DefaultConsentService(provider);
      })())
    : undefined;
  
  const auditService = (config.featureFlags?.audit !== false)
    ? (config.services?.audit || (() => {
        const provider = getProvider<IAuditDataProvider>('audit', config);
        if (!provider) return undefined;
        return new DefaultAuditService(provider);
      })())
    : undefined;
  
  const adminService = (config.featureFlags?.admin !== false)
    ? (config.services?.admin || (() => {
        const provider = getProvider<IAdminDataProvider>('admin', config);
        if (!provider) return undefined;
        return new DefaultAdminService(provider);
      })())
    : undefined;
  
  const roleService = (config.featureFlags?.roles !== false)
    ? (config.services?.role || (() => {
        const provider = getProvider<IRoleDataProvider>('role', config);
        if (!provider) return undefined;
        return new DefaultRoleService(provider);
      })())
    : undefined;
  
  const oauthService = (config.featureFlags?.oauth !== false)
    ? (config.services?.oauth || (() => {
        const provider = getProvider<IOAuthProvider>('oauth', config);
        if (!provider) return undefined;
        return new DefaultOAuthService(provider);
      })())
    : undefined;
  
  // 3. Return complete service container
  return {
    auth: authService,
    user: userService,
    permission: permissionService,
    team: teamService,
    sso: ssoService,
    gdpr: gdprService,
    twoFactor: twoFactorService,
    subscription: subscriptionService,
    apiKey: apiKeyService,
    notification: notificationService,
    webhook: undefined, // Add when available
    session: sessionService,
    organization: organizationService,
    csrf: csrfService,
    consent: consentService,
    audit: auditService,
    admin: adminService,
    role: roleService,
    address: undefined, // Add when available
    oauth: oauthService,
    companyNotification: undefined, // Add when available
    resourceRelationship: undefined, // Add when available
  };
}

/**
 * Create services for API routes with default configuration
 * 
 * This is a convenience function for typical API route usage.
 */
export function createDefaultApiServices(): ServiceContainer {
  return createApiServices({
    featureFlags: {
      // Enable all features by default
      permissions: true,
      teams: true,
      sso: true,
      gdpr: true,
      twoFactor: true,
      subscription: true,
      apiKeys: true,
      notifications: true,
      sessions: true,
      organizations: true,
      csrf: true,
      consent: true,
      audit: true,
      admin: true,
      roles: true,
      oauth: true,
    }
  });
}

/**
 * Create minimal services for testing
 * 
 * This creates only the essential services for basic testing.
 */
export function createMinimalServices(overrides?: Partial<ServiceContainer>): ServiceContainer {
  const services = createApiServices({
    featureFlags: {
      // Disable all optional features
      permissions: false,
      teams: false,
      sso: false,
      gdpr: false,
      twoFactor: false,
      subscription: false,
      apiKeys: false,
      notifications: false,
      sessions: false,
      organizations: false,
      csrf: false,
      consent: false,
      audit: false,
      admin: false,
      roles: false,
      oauth: false,
    }
  });
  
  return {
    ...services,
    ...overrides,
  };
}