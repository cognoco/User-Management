/**
 * User Service Factory for API Routes
 *
 * This file provides factory functions for creating user services for use in API routes.
 * It ensures consistent configuration and dependency injection across all API endpoints.
 */

import { UserService } from "@/core/user/interfaces";
import type { IUserDataProvider } from "@/core/user/IUserDataProvider";
import { DefaultUserService } from "./default-user.service";
import { AdapterRegistry } from "@/adapters/registry";
// Service container import removed - using new pure factory pattern

export interface ApiUserServiceOptions {
  /**
   * When true, clears any cached instance to allow a fresh one to be created.
   * Primarily used in tests.
   */
  reset?: boolean;
}

let cachedService: UserService | null = null;

/**
 * Get the configured user service instance for API routes
 *
 * @returns Configured UserService instance
 */
export function getApiUserService(
  options: ApiUserServiceOptions = {},
): UserService {
  if (options.reset) {
    cachedService = null;
  }

  if (cachedService && !options.reset) {
    return cachedService;
  }

  if (!cachedService) {
    const userDataProvider =
      AdapterRegistry.getInstance().getAdapter<IUserDataProvider>("user");
    cachedService = new DefaultUserService(userDataProvider);
  }

  return cachedService;
}
