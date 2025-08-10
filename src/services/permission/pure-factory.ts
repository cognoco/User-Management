/**
 * Pure Permission Service Factory
 * 
 * This factory creates PermissionService instances without any circular dependencies.
 * All dependencies are explicitly passed in, making testing simple.
 */

import type { PermissionService } from '@/core/permission/interfaces';
import type { AuthService } from '@/core/auth/interfaces';
import type { PermissionDataProvider } from '@/adapters/permission/interfaces';
import { DefaultPermissionService } from './default-permission.service';
import { AdapterRegistry } from '@/adapters/registry';

/**
 * Dependencies required to create a PermissionService
 */
export interface PermissionServiceDependencies {
  adapterRegistry: AdapterRegistry;
  authService: AuthService;
  provider?: PermissionDataProvider;
}

/**
 * Create a PermissionService instance with explicit dependencies
 * 
 * @param deps Dependencies required to create the service
 * @returns Configured PermissionService instance
 */
export function createPermissionService(deps: PermissionServiceDependencies): PermissionService {
  const { adapterRegistry, authService, provider } = deps;

  // Use provided provider or resolve from registry
  const permissionProvider = provider || adapterRegistry.getAdapter<PermissionDataProvider>('permission');

  return new DefaultPermissionService(permissionProvider, authService);
}