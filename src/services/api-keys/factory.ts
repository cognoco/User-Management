/**
 * API Keys Service Factory for API Routes
 * 
 * This file provides factory functions for creating API key services for use in API routes.
 * It ensures consistent configuration and dependency injection across all API endpoints.
 */

import { ApiKeyService } from '@/core/api-keys/interfaces';
import type { IApiKeyDataProvider } from '@/core/api-keys';
import { AdapterRegistry } from '@/adapters/registry';
// Service container import removed - using new pure factory pattern
import { DefaultApiKeysService } from './default-api-keys.service';

export interface ApiKeysServiceOptions {
  reset?: boolean;
}

// Singleton instance for API routes
let apiKeyServiceInstance: ApiKeyService | null = null;

/**
 * Get the configured API key service instance for API routes
 * 
 * @returns Configured ApiKeyService instance
 */
export function getApiKeyService(options: ApiKeysServiceOptions = {}): ApiKeyService {
  if (options.reset) {
    apiKeyServiceInstance = null;
  }

  if (!apiKeyServiceInstance) {
    const provider = AdapterRegistry.getInstance().getAdapter<IApiKeyDataProvider>('apiKey');
    apiKeyServiceInstance = new DefaultApiKeysService(provider);
  }

  return apiKeyServiceInstance;
}

/**
 * Temporary alias for backwards compatibility with older route imports.
 */
export function getApiKeysService(options: ApiKeysServiceOptions = {}): ApiKeyService {
  return getApiKeyService(options);
}
