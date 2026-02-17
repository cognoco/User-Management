/**
 * Create an in-memory mock database provider for tests.
 *
 * @param options Optional configuration to seed the mock provider.
 * @returns A minimal {@link DatabaseProvider} implementation.
 */
import type { DatabaseProvider, DatabaseConfig } from '../../../lib/database/types';
import type { Profile, UserPreferences, ActivityLog } from '../../../types/database';

class MockDatabaseProvider implements DatabaseProvider {
  // Simplified in-memory store for demonstration
  private users: any[] = [];

  async createUser(data: any) { const user = { id: String(Date.now()), ...data }; this.users.push(user); return user; }
  async getUserById(id: string) { return this.users.find((u: any) => u.id === id) || null; }
  async getUserByEmail(email: string) { return this.users.find((u: any) => u.email === email) || null; }
  async updateUser(id: string, data: any) { const idx = this.users.findIndex((u: any) => u.id === id); if (idx === -1) throw new Error('not found'); this.users[idx] = { ...this.users[idx], ...data }; return this.users[idx]; }
  async deleteUser(id: string) { this.users = this.users.filter((u: any) => u.id !== id); }

  async createProfile(_data: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>): Promise<Profile> { throw new Error('Not implemented'); }
  async getProfileByUserId(_userId: string): Promise<Profile | null> { return null; }
  async updateProfile(_userId: string, _data: Partial<Profile>): Promise<Profile> { throw new Error('Not implemented'); }
  async deleteProfile(_userId: string): Promise<void> { return; }

  async createUserPreferences(_data: Omit<UserPreferences, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserPreferences> { throw new Error('Not implemented'); }
  async getUserPreferences(_userId: string): Promise<UserPreferences | null> { return null; }
  async updateUserPreferences(_userId: string, _data: Partial<UserPreferences>): Promise<UserPreferences> { throw new Error('Not implemented'); }
  async deleteUserPreferences(_userId: string): Promise<void> { return; }

  async createActivityLog(_data: Omit<ActivityLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<ActivityLog> { throw new Error('Not implemented'); }
  async getUserActivityLogs(_userId: string, _options?: { limit?: number; offset?: number }): Promise<ActivityLog[]> { return []; }
  async deleteUserActivityLogs(_userId: string): Promise<void> { return; }

  async getUserWithRelations(_id: string) { return null; }
}

export function createMockDatabaseProvider(options: Partial<DatabaseConfig> = {}): DatabaseProvider {
  return new MockDatabaseProvider();
}

export default createMockDatabaseProvider;
