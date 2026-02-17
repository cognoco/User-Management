import type { IOAuthDataProvider } from '@/core/oauth/IOAuthDataProvider';
import { SupabaseOAuthProvider } from './supabase/supabase-oauth.provider';

export function createSupabaseOAuthProvider(options: {
  supabaseUrl: string;
  supabaseKey: string;
  [key: string]: any;
}): IOAuthDataProvider {
  return new SupabaseOAuthProvider(options.supabaseUrl, options.supabaseKey);
}

export function createOAuthProvider(config: {
  type: 'supabase' | string;
  options: Record<string, any>;
}): IOAuthDataProvider {
  switch (config.type) {
    case 'supabase':
      return createSupabaseOAuthProvider(config.options as any);
    default:
      throw new Error(`Unsupported OAuth provider type: ${config.type}`);
  }
}

export default createSupabaseOAuthProvider;
