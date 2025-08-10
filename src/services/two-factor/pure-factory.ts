/**
 * Pure Two Factor Service Factory
 */

import type { TwoFactorService } from '@/core/two-factor/interfaces';
import type { AuthService } from '@/core/auth/interfaces';
import type { TwoFactorDataProvider } from '@/adapters/two-factor/interfaces';
import { DefaultTwoFactorService } from './default-two-factor.service';
import { AdapterRegistry } from '@/adapters/registry';

export interface TwoFactorServiceDependencies {
  adapterRegistry: AdapterRegistry;
  authService: AuthService;
  provider?: TwoFactorDataProvider;
}

export function createTwoFactorService(deps: TwoFactorServiceDependencies): TwoFactorService {
  const { adapterRegistry, authService, provider } = deps;
  const twoFactorProvider = provider || adapterRegistry.getAdapter<TwoFactorDataProvider>('twoFactor');
  return new DefaultTwoFactorService(twoFactorProvider, authService);
}