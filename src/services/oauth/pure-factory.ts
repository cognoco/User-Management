/**
 * Pure OAuth Service Factory
 */

import type { OAuthService } from '@/core/oauth/interfaces';
import type { AuthService } from '@/core/auth/interfaces';
import type { IOAuthDataProvider } from '@/core/oauth';
import { DefaultOAuthService } from './default-oauth.service';
import { AdapterRegistry } from '@/adapters/registry';

export interface OAuthServiceDependencies {
  adapterRegistry: AdapterRegistry;
  authService: AuthService;
  provider?: IOAuthDataProvider;
}

export function createOAuthService(deps: OAuthServiceDependencies): OAuthService {
  const { adapterRegistry, authService, provider } = deps;
  const oauthProvider = provider || adapterRegistry.getAdapter<IOAuthDataProvider>('oauth');
  return new DefaultOAuthService(oauthProvider, authService);
}