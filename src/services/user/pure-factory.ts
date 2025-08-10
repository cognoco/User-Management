/**
 * Pure User Service Factory
 * 
 * This factory creates UserService instances without any circular dependencies.
 * All dependencies are explicitly passed in, making testing simple.
 */

import type { UserService } from '@/core/user/interfaces';
import type { AuthService } from '@/core/auth/interfaces';
import type { UserDataProvider } from '@/adapters/user/interfaces';
import { DefaultUserService } from './default-user.service';
import { AdapterRegistry } from '@/adapters/registry';

/**
 * Dependencies required to create a UserService
 */
export interface UserServiceDependencies {
  adapterRegistry: AdapterRegistry;
  authService: AuthService;
  provider?: UserDataProvider;
}

/**
 * Create a UserService instance with explicit dependencies
 * 
 * @param deps Dependencies required to create the service
 * @returns Configured UserService instance
 */
export function createUserService(deps: UserServiceDependencies): UserService {
  const { adapterRegistry, authService, provider } = deps;

  // Use provided provider or resolve from registry
  const userProvider = provider || adapterRegistry.getAdapter<UserDataProvider>('user');

  return new DefaultUserService(userProvider, authService);
}