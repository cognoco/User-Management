/**
 * Team Service Factory
 * 
 * Factory for creating team service instances
 */

import { AdapterRegistry } from '@/adapters/registry';
import type { ITeamDataProvider } from '@/core/team/ITeamDataProvider';
import type { TeamService } from '@/core/team/interfaces';
import { DefaultTeamService } from './default-team.service';

// Singleton instance
let teamServiceInstance: TeamService | null = null;

/**
 * Get team service instance
 */
export function getTeamService(): TeamService {
  if (!teamServiceInstance) {
    try {
      const provider = AdapterRegistry.getInstance().getAdapter<ITeamDataProvider>('team');
      teamServiceInstance = new DefaultTeamService(provider);
    } catch {
      // If no provider is available, create with minimal setup
      // This will be replaced once providers are properly registered
      teamServiceInstance = new DefaultTeamService({} as ITeamDataProvider);
    }
  }
  
  return teamServiceInstance;
}