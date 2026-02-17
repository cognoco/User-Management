/**
 * Supabase Adapter Factory
 * 
 * This file implements the AdapterFactory interface for Supabase adapters.
 * It provides methods to create Supabase adapter instances for different data providers.
 */


import { AdapterFactory, AdapterFactoryOptions } from './registry';
import { AuthDataProvider } from './auth/interfaces';
import { IUserDataProvider as UserDataProvider } from '@/core/user/IUserDataProvider';
import { ITeamDataProvider as TeamDataProvider } from '@/core/team/ITeamDataProvider';
import { IPermissionDataProvider as PermissionDataProvider } from '@/core/permission/IPermissionDataProvider';
import { IGdprDataProvider as GdprDataProvider } from '@/core/gdpr/IGdprDataProvider';
import { IConsentDataProvider } from '@/core/consent/IConsentDataProvider';
import { ISessionDataProvider as SessionDataProvider } from '@/core/session/ISessionDataProvider';
import { ISsoDataProvider as SsoDataProvider } from '@/core/sso/ISsoDataProvider';
import { ISubscriptionDataProvider as SubscriptionDataProvider } from '@/core/subscription/ISubscriptionDataProvider';
import { IApiKeyDataProvider as ApiKeyDataProvider } from '@/core/api-keys/IApiKeyDataProvider';
import { IWebhookDataProvider } from '@/core/webhooks/IWebhookDataProvider';
import { IOrganizationDataProvider } from '@/core/organization/IOrganizationDataProvider';
import { IAdminDataProvider } from '@/core/admin/IAdminDataProvider';
import type { ITwoFactorDataProvider } from '@/core/two-factor/ITwoFactorDataProvider';
import { ISavedSearchDataProvider } from '@/core/saved-search/ISavedSearchDataProvider';


// Import domain-specific factories
import { createSupabaseAuthProvider } from './auth/factory';
import { createSupabaseUserProvider } from './user/factory';
import { createSupabaseTeamProvider } from './team/factory';
import { createSupabaseOrganizationProvider } from './organization/factory';
import { createSupabasePermissionProvider } from './permission/factory';
import { createSupabaseGdprProvider } from './gdpr/factory';
import { createSupabaseConsentProvider } from './consent/factory';
import { createSupabaseSessionProvider } from './session/factory';
import { createSupabaseSsoProvider } from './sso/factory';
import { createSupabaseOAuthProvider } from './oauth/factory';
import type { IOAuthDataProvider as OAuthDataProvider } from './oauth';
import { createSupabaseSubscriptionProvider } from './subscription/factory';
import { createSupabaseCompanyNotificationProvider } from './company-notification/factory';
import { createSupabaseWebhookProvider } from './webhooks';
import { createSupabaseAdminProvider } from './admin/factory';
import { createSupabaseTwoFactorProvider } from './two-factor/factory';
import { createSupabaseSavedSearchProvider } from './saved-search/factory';
import { createSupabaseDataExportProvider } from './data-export/factory';
import type { IDataExportDataProvider } from '@/core/data-export/IDataExportDataProvider';
import { createSupabaseApiKeyProvider } from './api-keys/factory';
import type { ICompanyNotificationDataProvider } from '@/core/company-notification/ICompanyNotificationDataProvider';



/**
 * Factory for creating Supabase adapters
 */
export class SupabaseAdapterFactory implements AdapterFactory {
  private options: {
    supabaseUrl: string;
    supabaseKey: string;
    isServer?: boolean;
    context?: Record<string, any>;
    [key: string]: any;
  };

  constructor(options: AdapterFactoryOptions) {
    this.options = {
      supabaseUrl: options.supabaseUrl as string,
      supabaseKey: options.supabaseKey as string,
      isServer: options.isServer as boolean | undefined,
      context: options.context as Record<string, any> | undefined,
      ...options
    };

    if (!this.options.supabaseUrl || !this.options.supabaseKey) {
      throw new Error('Supabase URL and Key are required for SupabaseAdapterFactory');
    }
  }

  /**
   * Create a Supabase auth provider
   */
  createAuthProvider(): AuthDataProvider {
    return createSupabaseAuthProvider(
      this.options.supabaseUrl,
      this.options.supabaseKey
    );
  }

  /**
   * Create a Supabase user provider
   */
  createUserProvider(): UserDataProvider {
    return createSupabaseUserProvider(this.options.supabaseUrl, this.options.supabaseKey);
  }

  /**
   * Create a Supabase admin provider
   */
  createAdminProvider(): IAdminDataProvider {
    return createSupabaseAdminProvider(this.options.supabaseUrl, this.options.supabaseKey);
  }

  /**
   * Create a Supabase team provider
   */
  createTeamProvider(): TeamDataProvider {
    return createSupabaseTeamProvider(this.options.supabaseUrl, this.options.supabaseKey);
  }

  /**
   * Create a Supabase organization provider
   */
  createOrganizationProvider(): IOrganizationDataProvider {
    return createSupabaseOrganizationProvider(this.options);
  }

  /**
   * Create a Supabase permission provider
   */
  createPermissionProvider(): PermissionDataProvider {
    return createSupabasePermissionProvider(this.options.supabaseUrl, this.options.supabaseKey);
  }

  /**
  /**
   * Create a Supabase GDPR provider
   */
  createGdprProvider(): GdprDataProvider {
    return createSupabaseGdprProvider(this.options);
  }

  /**
   * Create a Supabase consent provider
   */
  createConsentProvider(): IConsentDataProvider {
    return createSupabaseConsentProvider(this.options);
  }

  /**
   * Create a Supabase session provider
   */
  createSessionProvider(): SessionDataProvider {
    return createSupabaseSessionProvider(this.options);
  }

  /**
   * Create a Supabase two-factor provider
   */
  createTwoFactorProvider(): ITwoFactorDataProvider {
    return createSupabaseTwoFactorProvider(this.options);
  }

  /**
   * Create a Supabase SSO provider
   */
  createSsoProvider(): SsoDataProvider {
    return createSupabaseSsoProvider(this.options.supabaseUrl, this.options.supabaseKey);
  }

  /**
   * Create a Supabase OAuth provider
   */
  createOAuthProvider(): OAuthDataProvider {
    return createSupabaseOAuthProvider(this.options);
  }

  /**
   * Create a Supabase subscription provider
   */
  createSubscriptionProvider(): SubscriptionDataProvider {
    return createSupabaseSubscriptionProvider(this.options);
  }
  /**
   * Create a Supabase API key provider
   */
  createApiKeyProvider(): ApiKeyDataProvider {
    return createSupabaseApiKeyProvider(this.options);
  }

  /**
/**
 * Create a Supabase company notification provider
 */
createCompanyNotificationProvider(): ICompanyNotificationDataProvider {
  return createSupabaseCompanyNotificationProvider(this.options);
}

/**
 * Create a Supabase saved search provider
 */
createSavedSearchProvider(): ISavedSearchDataProvider {
  return createSupabaseSavedSearchProvider(this.options);
}

/**
 * Create a Supabase data export provider
 */
createDataExportProvider(): IDataExportDataProvider {
  return createSupabaseDataExportProvider(this.options);
}

  /**
   * Create a Supabase webhook provider
   */
  createWebhookProvider(): IWebhookDataProvider {
    return createSupabaseWebhookProvider(this.options);
  }
}

/**
 * Factory creator function for Supabase adapters
 * 
 * @param options Configuration options including supabaseUrl and supabaseKey
 * @returns A new SupabaseAdapterFactory instance
 */
export function createSupabaseAdapterFactory(options: AdapterFactoryOptions): AdapterFactory {
  return new SupabaseAdapterFactory(options);
}

/**
 * Default export for the Supabase adapter factory creator
 */
export default createSupabaseAdapterFactory;
