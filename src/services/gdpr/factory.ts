/**
 * GDPR Service Factory for API Routes
 * 
 * This file provides factory functions for creating GDPR services for use in API routes.
 * It ensures consistent configuration and dependency injection across all API endpoints.
 */

import { GdprService } from '@/core/gdpr/interfaces';
import type { IGdprDataProvider } from '@/core/gdpr';
import { AdapterRegistry } from '@/adapters/registry';
// Service container import removed - using new pure factory pattern
import { DefaultGdprService } from './default-gdpr.service';

export interface GdprServiceOptions {
  reset?: boolean;
}

// Singleton instance for API routes
let gdprServiceInstance: GdprService | null = null;

/**
 * Get the configured GDPR service instance for API routes
 * 
 * @returns Configured GdprService instance
 */
export function getApiGdprService(options: GdprServiceOptions = {}): GdprService {
  if (options.reset) {
    gdprServiceInstance = null;
  }

  if (!gdprServiceInstance) {
    const gdprDataProvider = AdapterRegistry.getInstance().getAdapter<IGdprDataProvider>('gdpr');
    gdprServiceInstance = new DefaultGdprService(gdprDataProvider);
  }

  return gdprServiceInstance;
}

/**
 * Temporary alias for backwards compatibility with older route imports.
 */
export function getApiGDPRService(options: GdprServiceOptions = {}): GdprService {
  return getApiGdprService(options);
}
