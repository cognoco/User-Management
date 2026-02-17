import type { UserManagementConfig } from './core/config/interfaces';
import { configureServices } from './lib/config/service-container';

export function initializeUserManagement(config: UserManagementConfig) {
  configureServices(config.services || {});
  // Initialize with overrides
}

export * as styled from './ui/styled';
export * as headless from './ui/headless';
export * from './core/auth/interfaces';
