/**
 * Pure Audit Service Factory
 */

import type { AuditService } from '@/core/audit/interfaces';
import type { AuthService } from '@/core/auth/interfaces';
import type { IAuditDataProvider } from '@/core/audit';
import { DefaultAuditService } from './default-audit.service';
import { AdapterRegistry } from '@/adapters/registry';

export interface AuditServiceDependencies {
  adapterRegistry: AdapterRegistry;
  authService: AuthService;
  provider?: IAuditDataProvider;
}

export function createAuditService(deps: AuditServiceDependencies): AuditService {
  const { adapterRegistry, authService, provider } = deps;
  const auditProvider = provider || adapterRegistry.getAdapter<IAuditDataProvider>('audit');
  return new DefaultAuditService(auditProvider, authService);
}