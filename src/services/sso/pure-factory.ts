/**
 * Pure SSO Service Factory
 */

import type { SsoService } from '@/core/sso/interfaces';
import type { AuthService } from '@/core/auth/interfaces';
import type { SsoDataProvider } from '@/adapters/sso/interfaces';
import { DefaultSsoService } from './default-sso.service';
import { AdapterRegistry } from '@/adapters/registry';

export interface SsoServiceDependencies {
  adapterRegistry: AdapterRegistry;
  authService: AuthService;
  provider?: SsoDataProvider;
}

export function createSsoService(deps: SsoServiceDependencies): SsoService {
  const { adapterRegistry, authService, provider } = deps;
  const ssoProvider = provider || adapterRegistry.getAdapter<SsoDataProvider>('sso');
  return new DefaultSsoService(ssoProvider, authService);
}