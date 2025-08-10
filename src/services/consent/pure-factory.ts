/**
 * Pure Consent Service Factory
 */

import type { ConsentService } from '@/core/consent/interfaces';
import type { UserService } from '@/core/user/interfaces';
import type { IConsentDataProvider } from '@/core/consent';
import { DefaultConsentService } from './default-consent.service';
import { AdapterRegistry } from '@/adapters/registry';

export interface ConsentServiceDependencies {
  adapterRegistry: AdapterRegistry;
  userService: UserService;
  provider?: IConsentDataProvider;
}

export function createConsentService(deps: ConsentServiceDependencies): ConsentService {
  const { adapterRegistry, userService, provider } = deps;
  const consentProvider = provider || adapterRegistry.getAdapter<IConsentDataProvider>('consent');
  return new DefaultConsentService(consentProvider, userService);
}