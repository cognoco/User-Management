/**
 * Permission Service Factory for API Routes
 *
 * This file provides factory functions for creating permission services for use in API routes.
 * It ensures consistent configuration and dependency injection across all API endpoints.
 */

import { PermissionService } from "@/core/permission/interfaces";
import type { IPermissionDataProvider } from "@/core/permission/IPermissionDataProvider";
import { DefaultPermissionService } from "./default-permission.service";
import { AdapterRegistry } from "@/adapters/registry";
// Service container import removed - using new pure factory pattern

export interface ApiPermissionServiceOptions {
  /**
   * When true, clears any cached instance to allow a fresh one to be created.
   */
  reset?: boolean;
}

let cachedService: PermissionService | null = null;

/**
 * Get the configured permission service instance for API routes
 *
 * @returns Configured PermissionService instance
 */
export function getApiPermissionService(
  options: ApiPermissionServiceOptions = {},
): PermissionService {
  if (options.reset) {
    cachedService = null;
  }

  if (cachedService && !options.reset) {
    return cachedService;
  }

  if (!cachedService) {
    const permissionDataProvider =
      AdapterRegistry.getInstance().getAdapter<IPermissionDataProvider>(
        "permission",
      );
    cachedService = new DefaultPermissionService(permissionDataProvider);
  }

  return cachedService;
}
