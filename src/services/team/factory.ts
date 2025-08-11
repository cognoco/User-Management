/**
 * Team Service Factory for API Routes
 * 
 * This file provides factory functions for creating team services for use in API routes.
 * It ensures consistent configuration and dependency injection across all API endpoints.
 */

import { TeamService } from '@/core/team/interfaces';
import type { ITeamDataProvider } from '@/core/team/ITeamDataProvider';
import { DefaultTeamService } from './default-team.service';
import { AdapterRegistry } from '@/adapters/registry';
// Service container import removed - using new pure factory pattern

export interface ApiTeamServiceOptions {
  /** When true, resets the cached instance. Useful for tests */
  reset?: boolean;
}

const GLOBAL_CACHE_KEY = '__UM_TEAM_SERVICE__';

let cachedService: TeamService | null = null;

/**
 * Get the configured team service instance for API routes
 * 
 * @returns Configured TeamService instance
 */
export function getApiTeamService(
  options: ApiTeamServiceOptions = {}
): TeamService {
  if (options.reset) {
    cachedService = null;
    if (typeof globalThis !== 'undefined') {
      delete (globalThis as any)[GLOBAL_CACHE_KEY];
    }
  }

  if (!cachedService && typeof globalThis !== 'undefined') {
    cachedService = (globalThis as any)[GLOBAL_CACHE_KEY] as TeamService | null;
  }

  if (!cachedService) {
    cachedService = new DefaultTeamService(
      AdapterRegistry.getInstance().getAdapter<ITeamDataProvider>('team')
    );
  }

  if (cachedService && typeof globalThis !== 'undefined') {
    (globalThis as any)[GLOBAL_CACHE_KEY] = cachedService;
  }

  return cachedService;
}
