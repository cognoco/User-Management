/**
 * User Service Factory
 * 
 * This file exports the factory function for creating an instance of the UserService.
 * It follows the factory pattern to allow dependency injection and configuration.
 */

import { UserService } from '@/core/user/interfaces';
import { DefaultUserService } from './default-user.service';
export { RepositoryUserService } from './repository-user.service';
export { ApiUserService, getApiUserService } from './api-user.service';
import type { UserDataProvider } from '@/core/user/IUserDataProvider';

/**
 * Configuration options for creating a UserService
 */
export interface UserServiceConfig {
  /**
   * User data provider for database operations
   */
  userDataProvider: UserDataProvider;
}

/**
 * Create an instance of the UserService
 * 
 * @param config - Configuration options for the UserService
 * @returns An instance of the UserService
 */
export function createUserService(config: UserServiceConfig): UserService {
  return new DefaultUserService(config.userDataProvider);
}

/**
 * Default export of the user service module
 */
export default {
  createUserService
};

// Re-export from user.factory.ts for compatibility
export { getUserService } from './user.factory';
