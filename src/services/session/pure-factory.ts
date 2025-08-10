/**
 * Pure Session Service Factory
 */

import type { SessionService } from '@/core/session/interfaces';
import type { AuthService } from '@/core/auth/interfaces';
import type { SessionDataProvider } from '@/adapters/session/interfaces';
import { DefaultSessionService } from './default-session.service';
import { AdapterRegistry } from '@/adapters/registry';

export interface SessionServiceDependencies {
  adapterRegistry: AdapterRegistry;
  authService: AuthService;
  provider?: SessionDataProvider;
}

export function createSessionService(deps: SessionServiceDependencies): SessionService {
  const { adapterRegistry, authService, provider } = deps;
  const sessionProvider = provider || adapterRegistry.getAdapter<SessionDataProvider>('session');
  return new DefaultSessionService(sessionProvider, authService);
}