import type { IApiKeyDataProvider } from '@/core/api-keys/IApiKeyDataProvider';
import { SupabaseApiKeyProvider } from './supabase-adapter';

export function createSupabaseApiKeyProvider(options: { supabaseUrl: string; supabaseKey: string; [key: string]: any }): IApiKeyDataProvider {
  return new SupabaseApiKeyProvider(options.supabaseUrl, options.supabaseKey);
}

export function createApiKeyProvider(config: { type: 'supabase' | string; options: Record<string, any> }): IApiKeyDataProvider {
  switch (config.type) {
    case 'supabase':
      return createSupabaseApiKeyProvider(config.options as any);
    default:
      throw new Error(`Unsupported api key provider type: ${config.type}`);
  }
}
