/**
 * Audit Service Factory for API Routes
 * 
 * This file provides factory functions for creating audit services for use in API routes.
 * It ensures consistent configuration and dependency injection across all API endpoints.
 */

import { AuditService } from '@/core/audit/interfaces';
import { UserManagementConfiguration } from '@/core/config';
import type { IAuditDataProvider } from '@/core/audit';
import { AdapterRegistry } from '@/adapters/registry';
import { DefaultAuditService } from './default-audit.service';
// Service container import removed - using new pure factory pattern

/** Options for {@link getApiAuditService}. */
export interface ApiAuditServiceOptions {
  /** When true, clears any cached instance (useful for testing). */
  reset?: boolean;
}

// Singleton instance for API routes
let auditServiceInstance: AuditService | null = null;

/**
 * Get the configured audit service instance for API routes
 * 
 * @returns Configured AuditService instance
 */
export function getApiAuditService(
  options: ApiAuditServiceOptions = {}
): AuditService {
  if (options.reset) {
    auditServiceInstance = null;
  }

  if (!auditServiceInstance) {
    const configuredService = UserManagementConfiguration.getServiceProvider('auditService') as AuditService | undefined;
    
    if (configuredService) {
      auditServiceInstance = configuredService;
    } else {
      const provider = AdapterRegistry.getInstance().getAdapter<IAuditDataProvider>('audit');
      auditServiceInstance = new DefaultAuditService(provider);
    }
  }

  return auditServiceInstance;
}
