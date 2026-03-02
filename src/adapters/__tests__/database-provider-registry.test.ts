import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdapterRegistry } from '../registry';
import type { DatabaseProvider, DatabaseConfig } from '../../lib/database/types';

class DummyProvider implements DatabaseProvider {
  async createUser() { return {} as any; }
  async getUserById() { return null; }
  async getUserByEmail() { return null; }
  async updateUser() { return {} as any; }
  async deleteUser() {}
  async createProfile() { return {} as any; }
  async getProfileByUserId() { return null; }
  async updateProfile() { return {} as any; }
  async deleteProfile() {}
  async createUserPreferences() { return {} as any; }
  async getUserPreferences() { return null; }
  async updateUserPreferences() { return {} as any; }
  async deleteUserPreferences() {}
  async createActivityLog() { return {} as any; }
  async getUserActivityLogs() { return []; }
  async deleteUserActivityLogs() {}
  async getUserWithRelations() { return null; }
}

type Factory = (c: DatabaseConfig) => DatabaseProvider;

const factory: Factory = vi.fn(() => new DummyProvider());
const factory2: Factory = vi.fn(() => new DummyProvider());

beforeEach(() => {
  (AdapterRegistry as any).databaseFactories = {};
  (AdapterRegistry as any).defaultDatabaseProviderName = null;
  (AdapterRegistry as any).instance = null;
});

describe('database provider registry', () => {
  it('registers and retrieves provider by name', () => {
    AdapterRegistry.registerDatabaseFactory('dummy', factory);
    const provider = AdapterRegistry.getDatabaseProvider('dummy', { provider: 'supabase' } as any);
    expect(provider).toBeInstanceOf(DummyProvider);
    expect(factory).toHaveBeenCalled();
  });

  it('switches active provider', () => {
    AdapterRegistry.registerDatabaseFactory('a', factory);
    AdapterRegistry.registerDatabaseFactory('b', factory2);
    const registry = AdapterRegistry.getInstance();
    const first = registry.setActiveDatabaseProvider('a', { provider: 'supabase' } as any);
    expect(registry.getActiveDatabaseProvider()).toBe(first);
    const second = registry.setActiveDatabaseProvider('b', { provider: 'supabase' } as any);
    expect(registry.getActiveDatabaseProvider()).toBe(second);
  });

  it('returns default provider', () => {
    AdapterRegistry.registerDatabaseFactory('dummy', factory);
    AdapterRegistry.setDefaultDatabaseProvider('dummy');
    const provider = AdapterRegistry.getDefaultDatabaseProvider({ provider: 'supabase' } as any);
    expect(provider).toBeInstanceOf(DummyProvider);
  });

  it('throws for unknown providers', () => {
    expect(() => AdapterRegistry.getDatabaseProvider('missing', {} as any)).toThrow();
    expect(() => AdapterRegistry.setDefaultDatabaseProvider('missing')).toThrow();
  });
});
