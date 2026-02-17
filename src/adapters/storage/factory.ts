import { SupabaseStorageAdapter } from './supabase/SupabaseStorageAdapter';
import type { StorageAdapter } from '@/core/storage/interfaces';

export function createSupabaseStorageAdapter(options: {
  bucket: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  [key: string]: any;
}): StorageAdapter {
  return new SupabaseStorageAdapter(options.bucket);
}

export function createStorageProvider(config: {
  type: 'supabase' | string;
  options: Record<string, any>;
}): StorageAdapter {
  switch (config.type) {
    case 'supabase':
      return createSupabaseStorageAdapter(config.options as any);
    default:
      throw new Error(`Unsupported storage provider type: ${config.type}`);
  }
}

export default createSupabaseStorageAdapter;