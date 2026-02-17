/**
 * Resource Relationship Service Factory for API Routes
 * 
 * This file provides factory functions for creating resource relationship services for use in API routes.
 * It ensures consistent configuration and dependency injection across all API endpoints.
 */

import { AdapterRegistry } from '@/adapters/registry';
import { getServiceContainer } from '@/lib/config/service-container';
import type { ResourceRelationshipService } from '@/core/resource-relationship/interfaces';
import type { IResourceRelationshipDataProvider } from '@/core/resource-relationship/IResourceRelationshipDataProvider';
import { DefaultResourceRelationshipService } from './default-resource-relationship.service';

/**
 * Options for {@link getApiResourceRelationshipService}
 */
export interface ApiResourceRelationshipServiceOptions {
  /**
   * When true, forces creation of a new service instance. Useful in tests.
   */
  reset?: boolean;
}

// Singleton instance for API routes
let resourceRelationshipServiceInstance: ResourceRelationshipService | null = null;

/**
 * Get the configured resource relationship service instance for API routes
 * 
 * @param options Configuration options for the service
 * @returns Configured ResourceRelationshipService instance
 */
export function getApiResourceRelationshipService(
  options: ApiResourceRelationshipServiceOptions = {}
): ResourceRelationshipService {
  if (options.reset) {
    resourceRelationshipServiceInstance = null;
  }

  if (!resourceRelationshipServiceInstance) {
    // Check ServiceContainer first (respects host app overrides)
    resourceRelationshipServiceInstance = getServiceContainer().resourceRelationship ?? null;
    
    // Fall back to adapter registry
    if (!resourceRelationshipServiceInstance) {
      const provider = AdapterRegistry.getInstance().getAdapter<IResourceRelationshipDataProvider>('resourceRelationship');
      resourceRelationshipServiceInstance = new DefaultResourceRelationshipService(provider);
    }
  }

  return resourceRelationshipServiceInstance;
}

/**
 * @deprecated Use getApiResourceRelationshipService instead
 * Backward compatibility alias for the old naming pattern
 */
export function createResourceRelationshipService(): ResourceRelationshipService {
  return getApiResourceRelationshipService();
}
