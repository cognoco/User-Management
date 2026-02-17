/**
 * Adapter Registry System
 * 
 * This file implements a registry system for adapter factories.
 * It allows different adapter implementations (Supabase, GraphQL, REST, etc.)
 * to be registered and used interchangeably, making the application truly
 * database-agnostic as per the architecture guidelines.
 */

import { AuthDataProvider } from '@/adapters/auth/interfaces';
import { IUserDataProvider } from '@/core/user/IUserDataProvider';
import { ITeamDataProvider } from '@/core/team/ITeamDataProvider';
import { IPermissionDataProvider } from '@/core/permission/IPermissionDataProvider';
import { IGdprDataProvider } from '@/core/gdpr/IGdprDataProvider';
import { IConsentDataProvider } from '@/core/consent/IConsentDataProvider';
import { SessionDataProvider } from '@/core/session/ISessionDataProvider';
import { SsoDataProvider } from '@/core/sso/ISsoDataProvider';
import { OAuthDataProvider } from '@/core/oauth/IOAuthDataProvider';
import { ISubscriptionDataProvider } from '@/core/subscription/ISubscriptionDataProvider';
import { IApiKeyDataProvider } from '@/core/api-keys/IApiKeyDataProvider';
import { IWebhookDataProvider } from '@/core/webhooks/IWebhookDataProvider';
import { ISavedSearchDataProvider } from '@/core/saved-search/ISavedSearchDataProvider';
import type { ITwoFactorDataProvider } from '@/core/two-factor/ITwoFactorDataProvider';
import { IOrganizationDataProvider } from '@/core/organization/IOrganizationDataProvider';
import { ICompanyNotificationDataProvider } from '@/core/company-notification/ICompanyNotificationDataProvider';
import { IAdminDataProvider } from '@/core/admin/IAdminDataProvider';
import { IDataExportDataProvider } from '@/core/data-export/IDataExportDataProvider';
import type { 
  DatabaseProvider, 
  DatabaseConfig 
} from '../lib/database/types';




/**
 * Interface for adapter factory options
 */
export interface AdapterFactoryOptions {
  [key: string]: any;
}

/**
 * Interface for adapter factory
 * Defines methods to create different data providers
 */
export interface AdapterFactory {
  /**
   * Create an authentication data provider
   */
  createAuthProvider(): AuthDataProvider;
  
  /**
   * Create a user data provider
   */
  createUserProvider(): IUserDataProvider;
  
  /**
   * Create a team data provider
   */
  createTeamProvider(): ITeamDataProvider;

  /**
   * Create an admin data provider
   */
  createAdminProvider?(): IAdminDataProvider;

  /**
   * Create an organization data provider
   */
  createOrganizationProvider?(): IOrganizationDataProvider;

  /**
   * Create a permission data provider
   */
  createPermissionProvider(): IPermissionDataProvider;

  /**
  /**
   * Create a GDPR data provider
   */
  createGdprProvider?(): IGdprDataProvider;

  /**
   * Create a consent data provider
   */
  createConsentProvider?(): IConsentDataProvider;

  /**
   * Create a session data provider
   */
  createSessionProvider(): SessionDataProvider;

  /**
   * Create a two-factor authentication data provider
   */
  createTwoFactorProvider?(): ITwoFactorDataProvider;

  /**
   * Create an SSO data provider
   */
  createSsoProvider(): SsoDataProvider;

  /**
   * Create an OAuth data provider
   */
  createOAuthProvider?(): OAuthDataProvider;

  /**
   * Create a subscription data provider
   */
  createSubscriptionProvider(): ISubscriptionDataProvider;

  /**
   * Create an API key data provider
   */
  createApiKeyProvider(): IApiKeyDataProvider;

  /**
   * Create a company notification data provider
   */
  createCompanyNotificationProvider?(): ICompanyNotificationDataProvider;

  /**
   * Create a data export provider
   */
  createDataExportProvider?(): IDataExportDataProvider;


  /**
   * Create a webhook data provider
   */
  createWebhookProvider?(): IWebhookDataProvider;

  /**
   * Create a saved search data provider
   */
  createSavedSearchProvider?(): ISavedSearchDataProvider;
}

/**
 * Factory function for creating a {@link DatabaseProvider}.
 */
export type DatabaseProviderFactory = (
  config: DatabaseConfig
) => DatabaseProvider;

/**
 * Factory creator function type
 */
export type FactoryCreator = (options: AdapterFactoryOptions) => AdapterFactory;

/**
 * Adapter registry class
 * Manages registration and retrieval of adapter factories
 */
export class AdapterRegistry {
  private static factories: Record<string, FactoryCreator> = {};
  private static databaseFactories: Record<string, DatabaseProviderFactory> = {};
  private static defaultDatabaseProviderName: string | null = null;
  private static instance: AdapterRegistry | null = null;

  private adapters: Record<string, unknown> = {};
  private activeDatabaseProvider: DatabaseProvider | null = null;

  private constructor() {}

  /**
   * Get the singleton instance of the registry
   */
  static getInstance(): AdapterRegistry {
    if (!this.instance) {
      this.instance = new AdapterRegistry();
    }
    return this.instance;
  }

  /**
   * Register a concrete adapter instance
   *
   * @param name Adapter name
   * @param adapter Adapter instance
   */
  registerAdapter<T>(name: string, adapter: T): void {
    this.adapters[name] = adapter;
  }

  /**
   * Retrieve a registered adapter instance
   *
   * @param name Adapter name
   * @returns Adapter instance
   */
  getAdapter<T>(name: string): T {
    const adapter = this.adapters[name];
    if (!adapter) {
      throw new Error(`Adapter '${name}' not registered in AdapterRegistry`);
    }
    return adapter as T;
  }
  
  /**
   * Register an adapter factory
   * 
   * @param name Name to register the factory under
   * @param factoryCreator Function that creates the factory
   */
  static registerFactory(name: string, factoryCreator: FactoryCreator): void {
    if (this.factories[name]) {
      throw new Error(`Adapter factory '${name}' is already registered`);
    }
    this.factories[name] = factoryCreator;
  }
  
  /**
   * Get an adapter factory by name
   * 
   * @param name Name of the factory to retrieve
   * @param options Options to pass to the factory creator
   * @returns The adapter factory instance
   * @throws Error if factory not found
   */
  static getFactory(name: string, options: AdapterFactoryOptions): AdapterFactory {
    const factoryCreator = this.factories[name];
    if (!factoryCreator) {
      throw new Error(`Adapter factory '${name}' not found. Available factories: ${Object.keys(this.factories).join(', ')}`);
    }
    return factoryCreator(options);
  }
  
  /**
   * List all available adapter types
   * 
   * @returns Array of registered adapter type names
   */
  static listAvailableAdapters(): string[] {
    return Object.keys(this.factories);
  }
  
  /**
   * Check if an adapter type is available
   * 
   * @param name Name of the adapter type to check
   * @returns True if the adapter type is registered, false otherwise
   */
  static isAdapterAvailable(name: string): boolean {
    return !!this.factories[name];
  }

  /**
   * Register a database provider factory.
   *
   * @param name    Unique provider name.
   * @param factory Factory function that creates the provider.
   */
  static registerDatabaseFactory(
    name: string,
    factory: DatabaseProviderFactory
  ): void {
    if (this.databaseFactories[name]) {
      throw new Error(`Database provider '${name}' is already registered`);
    }
    this.databaseFactories[name] = factory;
  }

  /**
   * Retrieve a database provider instance by name.
   *
   * @param name   Provider identifier.
   * @param config Configuration object passed to the factory.
   * @returns A database provider instance.
   */
  static getDatabaseProvider(
    name: string,
    config: DatabaseConfig
  ): DatabaseProvider {
    const factory = this.databaseFactories[name];
    if (!factory) {
      throw new Error(
        `Database provider '${name}' not registered. Available providers: ${Object.keys(
          this.databaseFactories
        ).join(', ')}`
      );
    }
    return factory(config);
  }

  /**
   * Set the default database provider for the application.
   *
   * @param name Provider name previously registered.
   */
  static setDefaultDatabaseProvider(name: string): void {
    if (!this.databaseFactories[name]) {
      throw new Error(`Database provider '${name}' is not registered`);
    }
    this.defaultDatabaseProviderName = name;
  }

  /**
   * Get an instance of the default database provider.
   *
   * @param config Configuration passed to the provider factory.
   */
  static getDefaultDatabaseProvider(config: DatabaseConfig): DatabaseProvider {
    if (!this.defaultDatabaseProviderName) {
      throw new Error('Default database provider not set');
    }
    return this.getDatabaseProvider(this.defaultDatabaseProviderName, config);
  }

  /**
   * Set the currently active database provider for this registry instance.
   *
   * @param name   Provider name.
   * @param config Configuration passed to the factory.
   * @returns The created provider instance.
   */
  setActiveDatabaseProvider(
    name: string,
    config: DatabaseConfig
  ): DatabaseProvider {
    const provider = AdapterRegistry.getDatabaseProvider(name, config);
    this.activeDatabaseProvider = provider;
    return provider;
  }

  /**
   * Retrieve the active database provider.
   *
   * @returns The active provider instance.
   */
  getActiveDatabaseProvider(): DatabaseProvider {
    if (!this.activeDatabaseProvider) {
      throw new Error('Active database provider not set');
    }
    return this.activeDatabaseProvider;
  }
}
