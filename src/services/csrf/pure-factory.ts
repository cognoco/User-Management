/**
 * Pure CSRF Service Factory
 */

import type { CsrfService } from '@/core/csrf/interfaces';
import type { ICsrfDataProvider } from '@/core/csrf';
import { DefaultCsrfService } from './default-csrf.service';
import { AdapterRegistry } from '@/adapters/registry';

export interface CsrfServiceDependencies {
  adapterRegistry: AdapterRegistry;
  provider?: ICsrfDataProvider;
}

export function createCsrfService(deps: CsrfServiceDependencies): CsrfService {
  const { adapterRegistry, provider } = deps;
  const csrfProvider = provider || adapterRegistry.getAdapter<ICsrfDataProvider>('csrf');
  return new DefaultCsrfService(csrfProvider);
}