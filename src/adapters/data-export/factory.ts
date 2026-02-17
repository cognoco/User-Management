import type { IDataExportDataProvider } from '@/core/data-export/IDataExportDataProvider';
import { SupabaseDataExportProvider } from './supabase/supabase-data-export.provider';

export function createSupabaseDataExportProvider(options: {
  supabaseUrl: string;
  supabaseKey: string;
  [key: string]: any;
}): IDataExportDataProvider {
  return new SupabaseDataExportProvider(options.supabaseUrl, options.supabaseKey);
}

export function createDataExportProvider(config: {
  type: 'supabase' | string;
  options: Record<string, any>;
}): IDataExportDataProvider {
  switch (config.type) {
    case 'supabase':
      return createSupabaseDataExportProvider(config.options as any);
    default:
      throw new Error(`Unsupported data export provider type: ${config.type}`);
  }
}

export default createSupabaseDataExportProvider;
