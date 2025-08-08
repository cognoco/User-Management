/**
 * User Management Module Configuration System
 * 
 * This file provides the API for configuring the User Management Module.
 * It allows host applications to:
 * 1. Enable/disable specific features via feature flags
 * 2. Override default service implementations via the service provider registry
 * 3. Configure various options like redirect paths
 */

import {
  UserManagementConfig,
  FeatureFlags,
  ServiceProviderRegistry,
  DEFAULT_CONFIG
} from './interfaces';

// The global configuration instance
let configInstance: UserManagementConfig = { ...DEFAULT_CONFIG };

/**
 * Configure the User Management Module
 * 
 * @param config Partial configuration to merge with defaults
 * @returns The complete configuration after merging
 */
export function configureUserManagement(config: Partial<UserManagementConfig>): UserManagementConfig {
  // Deep merge the provided config with the current config
  configInstance = {
    featureFlags: {
      ...configInstance.featureFlags,
      ...config.featureFlags
    },
    serviceProviders: {
      ...configInstance.serviceProviders,
      ...config.serviceProviders
    },
    options: {
      ...configInstance.options,
      ...config.options,
      redirects: {
        ...configInstance.options.redirects,
        ...config?.options?.redirects
      },
      api: {
        ...configInstance.options.api,
        ...config?.options?.api
      },
      ui: {
        ...configInstance.options.ui,
        ...config?.options?.ui
      },
      security: {
        ...configInstance.options.security,
        ...config?.options?.security
      }
    }
  };
  
  return configInstance;
}

/**
 * Configure feature flags
 * 
 * @param flags Partial feature flags to merge with defaults
 * @returns The complete feature flags after merging
 */
export function configureFeatures(flags: Partial<FeatureFlags>): FeatureFlags {
  configInstance.featureFlags = {
    ...configInstance.featureFlags,
    ...flags
  };
  
  return configInstance.featureFlags;
}

/**
 * Configure service providers
 * 
 * @param providers Service providers to register
 * @returns The complete service provider registry after merging
 */
export function configureServiceProviders(providers: Partial<ServiceProviderRegistry>): ServiceProviderRegistry {
  configInstance.serviceProviders = {
    ...configInstance.serviceProviders,
    ...providers
  };
  
  return configInstance.serviceProviders;
}

/**
 * Reset configuration to defaults
 * Useful for testing
 */
export function resetConfiguration(): void {
  configInstance = { ...DEFAULT_CONFIG };
}

/**
 * Get the current configuration
 * 
 * @returns The current configuration
 */
export function getConfiguration(): UserManagementConfig {
  return { ...configInstance };
}

/**
 * Check if a feature is enabled
 * 
 * @param featureName Name of the feature to check
 * @returns True if the feature is enabled, false otherwise
 */
export function isFeatureEnabled(featureName: keyof FeatureFlags): boolean {
  return configInstance.featureFlags[featureName] === true;
}

/**
 * Get a service provider
 * 
 * @param providerName Name of the service provider
 * @returns The service provider instance or undefined if not registered
 */
export function getServiceProvider<T>(providerName: string): T | undefined {
  return configInstance.serviceProviders[providerName] as T | undefined;
}

// Export the interfaces and default values
export * from './interfaces';
export * from './config-context';
// Avoid exporting adapter configuration in the client bundle to prevent
// accidental inclusion of server-only adapters (which may import email/nodemailer).
// Server code should import from '@/core/config/adapter-config' directly when needed.
export * from './client-config';
export * from './environment';
// IMPORTANT: Import server-only runtime-config directly from server code
// to avoid bringing Node modules (fs/path) into client bundles.
// export * from './runtime-config';
export * from './AppInitializer';

// Export a singleton instance for convenience
export const UserManagementConfiguration = {
  configure: configureUserManagement,
  configureFeatures,
  configureServiceProviders,
  reset: resetConfiguration,
  getConfig: getConfiguration,
  isFeatureEnabled,
  getServiceProvider
};
