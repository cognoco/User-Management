/**
 * Pure Team Service Factory
 */

import type { TeamService } from '@/core/team/interfaces';
import type { AuthService } from '@/core/auth/interfaces';
import type { UserService } from '@/core/user/interfaces';
import type { PermissionService } from '@/core/permission/interfaces';
import type { TeamDataProvider } from '@/adapters/team/interfaces';
import { DefaultTeamService } from './default-team.service';
import { AdapterRegistry } from '@/adapters/registry';

export interface TeamServiceDependencies {
  adapterRegistry: AdapterRegistry;
  authService: AuthService;
  userService: UserService;
  permissionService?: PermissionService;
  provider?: TeamDataProvider;
}

export function createTeamService(deps: TeamServiceDependencies): TeamService {
  const { adapterRegistry, authService, userService, permissionService, provider } = deps;
  const teamProvider = provider || adapterRegistry.getAdapter<TeamDataProvider>('team');
  return new DefaultTeamService(teamProvider, authService, userService, permissionService);
}