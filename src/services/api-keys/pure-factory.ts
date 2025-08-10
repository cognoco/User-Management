/**
 * Pure API Keys Service Factory
 */

import type { ApiKeyService } from '@/core/api-keys/interfaces';
import type { AuthService } from '@/core/auth/interfaces';
import type { IApiKeyDataProvider } from '@/core/api-keys';
import { DefaultApiKeysService } from './default-api-keys.service';
import { AdapterRegistry } from '@/adapters/registry';

export interface ApiKeyServiceDependencies {
  adapterRegistry: AdapterRegistry;
  authService: AuthService;
  provider?: IApiKeyDataProvider;
}

export function createApiKeyService(deps: ApiKeyServiceDependencies): ApiKeyService {
  const { adapterRegistry, authService, provider } = deps;
  const apiKeyProvider = provider || adapterRegistry.getAdapter<IApiKeyDataProvider>('apiKey');
  return new DefaultApiKeysService(apiKeyProvider);
}