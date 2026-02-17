import type { ISavedSearchDataProvider } from '@/core/saved-search/ISavedSearchDataProvider';
import { SupabaseSavedSearchProvider } from './supabase/supabase-saved-search.provider';

/**
 * Create a Supabase saved search data provider instance.
 */
export function createSupabaseSavedSearchProvider(options: {
  supabaseUrl: string;
  supabaseKey: string;
  [key: string]: any;
}): ISavedSearchDataProvider {
  return new SupabaseSavedSearchProvider(options.supabaseUrl, options.supabaseKey);
}

/**
 * Factory helper to create providers based on configuration.
 */
export function createSavedSearchProvider(config: {
  type: 'supabase' | string;
  options: Record<string, any>;
}): ISavedSearchDataProvider {
  switch (config.type) {
    case 'supabase':
      return createSupabaseSavedSearchProvider(config.options as any);
    default:
      throw new Error(`Unsupported saved search provider type: ${config.type}`);
  }
}

export default createSupabaseSavedSearchProvider;
