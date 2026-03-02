import type { IOrganizationDataProvider } from '@/core/organization/IOrganizationDataProvider';
import { DefaultOrganizationAdapter } from './default-organization-adapter';
import { SupabaseOrganizationProvider } from './supabase/supabase-organization.provider';

export function createDefaultOrganizationProvider(): IOrganizationDataProvider {
  return new DefaultOrganizationAdapter();
}

export function createSupabaseOrganizationProvider(options: {
  supabaseUrl: string;
  supabaseKey: string;
  [key: string]: any;
}): IOrganizationDataProvider {
  return new SupabaseOrganizationProvider(options.supabaseUrl, options.supabaseKey);
}

export function createOrganizationProvider(config?: {
  type?: 'default' | 'supabase' | string;
  options?: Record<string, any>;
}): IOrganizationDataProvider {
  if (!config || config.type === 'default') {
    return createDefaultOrganizationProvider();
  }
  if (config.type === 'supabase') {
    const opts = config.options || {};
    if (!opts.supabaseUrl || !opts.supabaseKey) {
      throw new Error('Supabase organization provider requires supabaseUrl and supabaseKey options');
    }
    return createSupabaseOrganizationProvider(opts as { supabaseUrl: string; supabaseKey: string });
  }
  throw new Error(`Unsupported organization provider type: ${config.type}`);
}

export default createSupabaseOrganizationProvider;
