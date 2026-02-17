import { createSupabaseDatabaseProvider } from './supabase-factory';
import { createPrismaDatabaseProvider } from './prisma-factory';
import { createMockDatabaseProvider } from './mock-factory';
import type { DatabaseConfig, DatabaseProvider } from '../../../lib/database/types';

export { createSupabaseDatabaseProvider } from './supabase-factory';
export { createPrismaDatabaseProvider } from './prisma-factory';
export { createMockDatabaseProvider } from './mock-factory';

/**
 * Get a database provider instance by name.
 *
 * @param provider Provider identifier ('supabase' | 'prisma' | 'mock').
 * @param config   Configuration object specific to the provider.
 */
export function getDatabaseProvider(
  provider: 'supabase' | 'prisma' | 'mock',
  config: DatabaseConfig
): DatabaseProvider {
  switch (provider) {
    case 'supabase':
      return createSupabaseDatabaseProvider(config);
    case 'prisma':
      return createPrismaDatabaseProvider(config);
    case 'mock':
      return createMockDatabaseProvider(config);
    default:
      throw new Error(`Unsupported database provider: ${provider}`);
  }
}
