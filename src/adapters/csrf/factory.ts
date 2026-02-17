import type { ICsrfDataProvider } from '@/core/csrf/ICsrfDataProvider';
import { DefaultCsrfProvider } from './default-adapter';
import { SupabaseCsrfProvider } from './supabase/supabase-csrf.provider';

export function createDefaultCsrfProvider(): ICsrfDataProvider {
  return new DefaultCsrfProvider();
}

export function createSupabaseCsrfProvider(options: {
  supabaseUrl: string;
  supabaseKey: string;
  [key: string]: any;
}): ICsrfDataProvider {
  return new SupabaseCsrfProvider(options.supabaseUrl, options.supabaseKey);
}

export function createCsrfProvider(config?: {
  type?: 'default' | 'supabase' | string;
  options?: Record<string, any>;
}): ICsrfDataProvider {
  if (!config || config.type === 'default') {
    return createDefaultCsrfProvider();
  }
  if (config.type === 'supabase') {
    return createSupabaseCsrfProvider((config.options || {}) as { supabaseUrl: string; supabaseKey: string; [key: string]: any });
  }
  throw new Error(`Unsupported CSRF provider type: ${config.type}`);
}

export default createSupabaseCsrfProvider;
