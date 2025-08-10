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

// Use the new pure service factory
import { createApiServices, type ServiceFactoryConfig } from '@/lib/services/factory';

/**
 * Service creation dependencies that can be injected for testing
 */
export interface ServiceDependencies {
  adapterRegistry?: any;
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
 * Configuration for creating user management services
 */
export interface UserManagementConfiguration {
  /** Service overrides for testing */
  services?: Partial<ServiceContainer>;
  
  /** Feature flags */
  featureFlags?: FeatureFlags;
  
  /** External dependencies (for testing) */
  dependencies?: ServiceDependencies;
  
  /** Environment configuration */
  environment?: {
    supabaseUrl?: string;
    supabaseKey?: string;
  };
  
  /** Data provider overrides */
  providers?: Record<string, any>;
}

/**
 * Main factory function to configure all user management services
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
  // Use the new pure factory that eliminates circular dependencies
  return createApiServices({
    services: config.services,
    featureFlags: config.featureFlags,
    env: config.environment,
    providers: config.providers
  } as ServiceFactoryConfig);
}

/**
 * Create a minimal service container for testing with only required services
 */
export function createMinimalServices(overrides?: Partial<ServiceContainer>): ServiceContainer {
  return configureUserManagement({
    services: overrides,
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

/**
 * Create services with all features enabled (default for production)
 */
export function createFullServices(overrides?: Partial<ServiceContainer>): ServiceContainer {
  return configureUserManagement({
    services: overrides,
    featureFlags: {
      permissions: true,
      teams: true,
      sso: true,
      gdpr: true,
      twoFactor: true,
      subscription: true,
      apiKeys: true,
      notifications: true,
      webhooks: true,
      sessions: true,
      organizations: true,
      csrf: true,
      consent: true,
      audit: true,
      admin: true,
      roles: true,
      addresses: true,
      oauth: true,
    }
  });
}

/**
 * Create services for testing with mock implementations
 */
export function createTestServices(mocks: Partial<ServiceContainer>): ServiceContainer {
  return configureUserManagement({
    services: mocks,
    featureFlags: {
      // Enable only what's mocked
      permissions: !!mocks.permission,
      teams: !!mocks.team,
      sso: !!mocks.sso,
      gdpr: !!mocks.gdpr,
      twoFactor: !!mocks.twoFactor,
      subscription: !!mocks.subscription,
      apiKeys: !!mocks.apiKey,
      notifications: !!mocks.notification,
      webhooks: !!mocks.webhook,
      sessions: !!mocks.session,
      organizations: !!mocks.organization,
      csrf: !!mocks.csrf,
      consent: !!mocks.consent,
      audit: !!mocks.audit,
      admin: !!mocks.admin,
      roles: !!mocks.role,
      addresses: !!mocks.address,
      oauth: !!mocks.oauth,
    }
  });
}