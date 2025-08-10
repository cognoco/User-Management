/**
 * Pure GDPR Service Factory
 */

import type { GdprService } from '@/core/gdpr/interfaces';
import type { UserService } from '@/core/user/interfaces';
import type { IGdprDataProvider } from '@/core/gdpr';
import { DefaultGdprService } from './default-gdpr.service';
import { AdapterRegistry } from '@/adapters/registry';

export interface GdprServiceDependencies {
  adapterRegistry: AdapterRegistry;
  userService: UserService;
  provider?: IGdprDataProvider;
}

export function createGdprService(deps: GdprServiceDependencies): GdprService {
  const { adapterRegistry, userService, provider } = deps;
  const gdprProvider = provider || adapterRegistry.getAdapter<IGdprDataProvider>('gdpr');
  return new DefaultGdprService(gdprProvider);
}