/**
 * Webhooks Service Factory for API Routes
 * 
 * This file provides factory functions for creating webhook services for use in API routes.
 * It ensures consistent configuration and dependency injection across all API endpoints.
 */

import { IWebhookService } from '@/core/webhooks';
import type { IWebhookDataProvider } from '@/core/webhooks';
import { AdapterRegistry } from '@/adapters/registry';
import { WebhookService } from './WebhookService';
import { UserManagementConfiguration } from '@/core/config';
// Service container import removed - using new pure factory pattern

/** Options for {@link getApiWebhookService}. */
export interface ApiWebhookServiceOptions {
  /** When true, clears any cached instance (useful for testing). */
  reset?: boolean;
}

// Singleton instance for API routes
let webhookServiceInstance: IWebhookService | null = null;

/**
 * Get the configured webhook service instance for API routes
 * 
 * @returns Configured IWebhookService instance
 */
export function getApiWebhookService(
  options: ApiWebhookServiceOptions = {}
): IWebhookService {
  if (options.reset) {
    webhookServiceInstance = null;
  }

  if (!webhookServiceInstance) {
    const configuredService = UserManagementConfiguration.getServiceProvider('webhookService') as IWebhookService | undefined;
    
    if (configuredService) {
      webhookServiceInstance = configuredService;
    } else {
      const webhookDataProvider = AdapterRegistry.getInstance().getAdapter<IWebhookDataProvider>('webhook');
      webhookServiceInstance = new WebhookService(webhookDataProvider);
    }
  }

  return webhookServiceInstance;
}

