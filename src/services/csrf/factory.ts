/**
 * CSRF Service Factory for API Routes
 * 
 * This file provides factory functions for creating CSRF services for use in API routes.
 * It ensures consistent configuration and dependency injection across all API endpoints.
 */

import { CsrfService } from '@/core/csrf/interfaces';
import type { ICsrfDataProvider } from '@/core/csrf';
import { DefaultCsrfService } from './default-csrf.service';
import { AdapterRegistry } from '@/adapters/registry';
import { UserManagementConfiguration } from '@/core/config';
// Service container import removed - using new pure factory pattern

// Singleton instance for API routes
export interface ApiCsrfServiceOptions {
  /** When true, forces creation of a new service instance */
  reset?: boolean;
}

const GLOBAL_CACHE_KEY = '__UM_CSRF_SERVICE__';

let csrfServiceInstance: CsrfService | null = null;

/**
 * Get the configured CSRF service instance for API routes
 * 
 * @returns Configured CsrfService instance
 */
export function getApiCsrfService(
  options: ApiCsrfServiceOptions = {}
): CsrfService {
  if (options.reset) {
    csrfServiceInstance = null;
    if (typeof globalThis !== 'undefined') {
      delete (globalThis as any)[GLOBAL_CACHE_KEY];
    }
  }

  if (!csrfServiceInstance && typeof globalThis !== 'undefined') {
    csrfServiceInstance = (globalThis as any)[GLOBAL_CACHE_KEY] as
      | CsrfService
      | null;
  }

  if (!csrfServiceInstance) {
    csrfServiceInstance =
      UserManagementConfiguration.getServiceProvider(
        'csrfService'
      ) as CsrfService | null;

    if (!csrfServiceInstance) {
      const csrfDataProvider =
        AdapterRegistry.getInstance().getAdapter<ICsrfDataProvider>('csrf');
      csrfServiceInstance = new DefaultCsrfService(csrfDataProvider);
    }

    if (typeof globalThis !== 'undefined') {
      (globalThis as any)[GLOBAL_CACHE_KEY] = csrfServiceInstance;
    }
  }

  return csrfServiceInstance;
}

/**
 * Temporary alias for backwards compatibility with older route imports.
 */
export function getApiCSRFService(
  options: ApiCsrfServiceOptions = {}
): CsrfService {
  return getApiCsrfService(options);
}
