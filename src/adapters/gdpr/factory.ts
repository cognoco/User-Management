/**
 * GDPR Data Provider Factory
 *
 * Provides helper functions to create GDPR adapters.
 */
import type { IGdprDataProvider } from '@/core/gdpr/IGdprDataProvider';
import { SupabaseGdprProvider } from './supabase/supabase-gdpr.provider';

export function createSupabaseGdprProvider(options: {
  supabaseUrl: string;
  supabaseKey: string;
  [key: string]: any;
}): IGdprDataProvider {
  return new SupabaseGdprProvider(options.supabaseUrl, options.supabaseKey);
}

export function createGdprProvider(config: {
  type: 'supabase' | string;
  options: Record<string, any>;
}): IGdprDataProvider {
  switch (config.type) {
    case 'supabase':
      return createSupabaseGdprProvider(config.options as { supabaseUrl: string; supabaseKey: string; [key: string]: any });
    default:
      throw new Error(`Unsupported gdpr provider type: ${config.type}`);
  }
}

export default createSupabaseGdprProvider;
