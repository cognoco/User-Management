/**
 * Organization Service Factory for API routes.
 *
 * Provides a configured {@link OrganizationService} instance used across API
 * routes. The service instance is cached and can be reset between tests.
 */
import type { OrganizationService } from '@/core/organization/interfaces';
import type { IOrganizationDataProvider } from '@/core/organization/IOrganizationDataProvider';
import { AdapterRegistry } from '@/adapters/registry';
// Service container import removed - using new pure factory pattern
import { DefaultOrganizationService } from './default-organization.service';

/** Options for {@link getApiOrganizationService}. */
export interface ApiOrganizationServiceOptions {
  /** When true, clears any cached instance (useful for testing). */
  reset?: boolean;
}

let organizationServiceInstance: OrganizationService | null = null;

/**
 * Get a configured organization service instance for API routes.
 */
export function getApiOrganizationService(
  options: ApiOrganizationServiceOptions = {}
): OrganizationService {
  if (options.reset) {
    organizationServiceInstance = null;
  }

  if (!organizationServiceInstance) {
    const provider = AdapterRegistry.getInstance().getAdapter<IOrganizationDataProvider>('organization');
    organizationServiceInstance = new DefaultOrganizationService(provider);
  }

  return organizationServiceInstance;
}
