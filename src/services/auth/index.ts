/**
 * Authentication Service Factory
 * 
 * This file exports the factory function for creating an instance of the AuthService.
 * It follows the factory pattern to allow dependency injection and configuration.
 */

import { AuthService } from '@/core/auth/interfaces';
import { DefaultAuthService } from './default-auth.service';
import type { AuthDataProvider } from '@/adapters/auth/interfaces';
import type { AuthStorage } from './auth-storage';
import { BrowserAuthStorage } from './auth-storage';


/**
 * Configuration options for creating an AuthService
 */
export interface AuthServiceConfig {
  /**
   * Auth data provider for database operations
   */
  authDataProvider: AuthDataProvider;
  storage?: AuthStorage;
}

/**
 * Create an instance of the AuthService
 * 
 * @param config - Configuration options for the AuthService
 * @returns An instance of the AuthService
 */
export function createAuthService(config: AuthServiceConfig): AuthService {
  return new DefaultAuthService(
    config.authDataProvider,
    config.storage ?? new BrowserAuthStorage()
  ) as unknown as AuthService;
}

/**
 * Default export of the auth service module
 */
export default {
  createAuthService
};

export type { SessionTracker, SessionTrackerDeps } from './session-tracker';
export { DefaultSessionTracker } from './session-tracker';
export type { MFAHandler } from './mfa-handler';
export { DefaultMFAHandler } from './mfa-handler';