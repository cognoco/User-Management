import type { IResourceRelationshipDataProvider } from '@/core/resource-relationship/IResourceRelationshipDataProvider';
import { SupabaseResourceRelationshipProvider } from './supabase/supabase-resource-relationship.provider';

export function createSupabaseResourceRelationshipProvider(options: {
  supabaseUrl: string;
  supabaseKey: string;
  [key: string]: any;
}): IResourceRelationshipDataProvider {
  return new SupabaseResourceRelationshipProvider(options.supabaseUrl, options.supabaseKey);
}

export function createResourceRelationshipProvider(config: {
  type: 'supabase' | string;
  options: Record<string, any>;
}): IResourceRelationshipDataProvider {
  switch (config.type) {
    case 'supabase':
      return createSupabaseResourceRelationshipProvider(config.options as any);
    default:
      throw new Error(`Unsupported resource relationship provider type: ${config.type}`);
  }
}

export default createSupabaseResourceRelationshipProvider;
