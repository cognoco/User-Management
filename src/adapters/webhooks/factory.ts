/**
 * Webhook Data Provider Factory
 *
 * Provides factory functions for creating webhook data providers.
 * Enables dependency injection and easy swapping of implementations.
 */

import type { IWebhookDataProvider } from '@/core/webhooks/IWebhookDataProvider';
import { SupabaseWebhookProvider } from './supabase/supabase-webhook.provider';

/**
 * Create a Supabase webhook data provider
 *
 * @param supabaseUrl Supabase project URL
 * @param supabaseKey Supabase API key
 * @returns Supabase webhook provider instance
 */
export function createSupabaseWebhookProvider(options: {
  supabaseUrl: string;
  supabaseKey: string;
  [key: string]: any;
}): IWebhookDataProvider {
  return new SupabaseWebhookProvider(options.supabaseUrl, options.supabaseKey);
}

/**
 * Create a webhook data provider based on configuration
 *
 * @param config Configuration object with provider type and options
 * @returns Webhook data provider instance
 */
export function createWebhookProvider(config: {
  type: 'supabase' | string;
  options: Record<string, any>;
}): IWebhookDataProvider {
  switch (config.type) {
    case 'supabase':
      return createSupabaseWebhookProvider(config.options as any);
    default:
      throw new Error(`Unsupported webhook provider type: ${config.type}`);
  }
}

export default createSupabaseWebhookProvider;
