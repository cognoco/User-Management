/**
 * Pure Admin Service Factory
 */

import type { AdminService } from '@/core/admin/interfaces';
import type { AuthService } from '@/core/auth/interfaces';
import type { UserService } from '@/core/user/interfaces';
import type { PermissionService } from '@/core/permission/interfaces';
import type { IAdminDataProvider } from '@/core/admin';
import { DefaultAdminService } from './default-admin.service';
import { AdapterRegistry } from '@/adapters/registry';

export interface AdminServiceDependencies {
  adapterRegistry: AdapterRegistry;
  authService: AuthService;
  userService: UserService;
  permissionService?: PermissionService;
  provider?: IAdminDataProvider;
}

export function createAdminService(deps: AdminServiceDependencies): AdminService {
  const { adapterRegistry, authService, userService, permissionService, provider } = deps;
  const adminProvider = provider || adapterRegistry.getAdapter<IAdminDataProvider>('admin');
  return new DefaultAdminService(adminProvider, authService, userService, permissionService);
}