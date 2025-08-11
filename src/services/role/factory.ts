import type { RoleService as IRoleService } from "@/core/role/interfaces";
import { RoleService } from "./role.service";
// Service container import removed - using new pure factory pattern

export interface ApiRoleServiceOptions {
  /** Reset cached instance */
  reset?: boolean;
}

let cachedService: IRoleService | null = null;

/**
 * Role Service Factory for API routes
 */
export function getApiRoleService(
  options: ApiRoleServiceOptions = {},
): IRoleService {
  if (options.reset) {
    cachedService = null;
  }

  if (cachedService && !options.reset) {
    return cachedService;
  }

  if (!cachedService) {
    cachedService = new RoleService();
  }

  return cachedService;
}
