/**
 * Pure Organization Service Factory
 */

import type { OrganizationService } from '@/core/organization/interfaces';
import type { UserService } from '@/core/user/interfaces';
import type { TeamService } from '@/core/team/interfaces';
import type { OrganizationDataProvider } from '@/adapters/organization/interfaces';
import { DefaultOrganizationService } from './default-organization.service';
import { AdapterRegistry } from '@/adapters/registry';

export interface OrganizationServiceDependencies {
  adapterRegistry: AdapterRegistry;
  userService: UserService;
  teamService?: TeamService;
  provider?: OrganizationDataProvider;
}

export function createOrganizationService(deps: OrganizationServiceDependencies): OrganizationService {
  const { adapterRegistry, userService, teamService, provider } = deps;
  const orgProvider = provider || adapterRegistry.getAdapter<OrganizationDataProvider>('organization');
  return new DefaultOrganizationService(orgProvider, userService, teamService);
}