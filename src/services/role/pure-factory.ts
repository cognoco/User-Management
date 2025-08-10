/**
 * Pure Role Service Factory
 */

import type { RoleService } from '@/core/role/interfaces';
import type { AuthService } from '@/core/auth/interfaces';
import type { PermissionService } from '@/core/permission/interfaces';
import type { IRoleDataProvider } from '@/core/role/interfaces';
import { DefaultRoleService } from './default-role.service';
import { AdapterRegistry } from '@/adapters/registry';

export interface RoleServiceDependencies {
  adapterRegistry: AdapterRegistry;
  authService: AuthService;
  permissionService?: PermissionService;
  provider?: IRoleDataProvider;
}

export function createRoleService(deps: RoleServiceDependencies): RoleService {
  const { adapterRegistry, authService, permissionService, provider } = deps;
  const roleProvider = provider || adapterRegistry.getAdapter<IRoleDataProvider>('role');
  return new DefaultRoleService(roleProvider, authService, permissionService);
}