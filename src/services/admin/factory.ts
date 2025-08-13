/**
 * Admin Service Factory for API Routes
 *
 * This file provides factory functions for creating admin services for use in API routes.
 * It ensures consistent configuration and dependency injection across all API endpoints.
 */

import { AdminService } from '@/core/admin/interfaces';
import type { IAdminDataProvider } from '@/core/admin';
import { AdapterRegistry } from '@/adapters/registry';
import { DefaultAdminService } from './default-admin.service';
// Service container import removed - using new pure factory pattern

// Singleton instance for API routes
let adminServiceInstance: AdminService | null = null;

/**
 * Options for {@link getApiAdminService}
 */
export interface ApiAdminServiceOptions {
  /**
   * When true, clears the cached instance. Useful for tests.
   */
  reset?: boolean;
}

/**
 * Get the configured admin service instance for API routes
 *
 * @returns Configured AdminService instance
 */
export function getApiAdminService(
  options: ApiAdminServiceOptions = {}
): AdminService {
  if (options.reset) {
    adminServiceInstance = null;
  }

  if (!adminServiceInstance) {
    // Check service container first (for tests and dynamic configuration)
    try {
      const { getServiceContainer } = require('@/lib/config/service-container');
      const container = getServiceContainer();
      if (container.admin) {
        adminServiceInstance = container.admin as AdminService;
      }
    } catch {
      // Service container not available or service not configured
    }

    // If not in service container, create default with adapter
    if (!adminServiceInstance) {
      const provider = AdapterRegistry.getInstance().getAdapter<IAdminDataProvider>('admin');
      adminServiceInstance = new DefaultAdminService(provider);
    }
  }

  return adminServiceInstance;
}
