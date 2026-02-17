import { createClient } from '@supabase/supabase-js';
import { DatabaseProvider, DatabaseConfig } from '../types';
import { User, Profile, UserPreferences, ActivityLog, UserWithRelations } from '@/types/database';

export class SupabaseProvider implements DatabaseProvider {
  private client;

  constructor(config: DatabaseConfig) {
    if (!config.connectionString) {
      throw new Error('Supabase connection string is required');
    }
    const connStr = config.connectionString || '';
    const [url, key] = connStr.split('|');
    this.client = createClient(url || connStr, key || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
  }

  // User operations
  async createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const { data: user, error } = await this.client
      .from('users')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    const { data: user, error } = await this.client
      .from('users')
      .select()
      .eq('id', id)
      .single();

    if (error) throw error;
    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const { data: user, error } = await this.client
      .from('users')
      .select()
      .eq('email', email)
      .single();

    if (error) throw error;
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const { data: user, error } = await this.client
      .from('users')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    const { error } = await this.client
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Profile operations
  async createProfile(data: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>): Promise<Profile> {
    const { data: profile, error } = await this.client
      .from('profiles')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return profile;
  }

  async getProfileByUserId(userId: string): Promise<Profile | null> {
    const { data: profile, error } = await this.client
      .from('profiles')
      .select()
      .eq('userId', userId)
      .single();

    if (error) throw error;
    return profile;
  }

  async updateProfile(userId: string, data: Partial<Profile>): Promise<Profile> {
    const { data: profile, error } = await this.client
      .from('profiles')
      .update(data)
      .eq('userId', userId)
      .select()
      .single();

    if (error) throw error;
    return profile;
  }

  async deleteProfile(userId: string): Promise<void> {
    const { error } = await this.client
      .from('profiles')
      .delete()
      .eq('userId', userId);

    if (error) throw error;
  }

  // User preferences operations
  async createUserPreferences(data: Omit<UserPreferences, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserPreferences> {
    const { data: preferences, error } = await this.client
      .from('user_preferences')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return preferences;
  }

  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    const { data: preferences, error } = await this.client
      .from('user_preferences')
      .select()
      .eq('userId', userId)
      .single();

    if (error) throw error;
    return preferences;
  }

  async updateUserPreferences(userId: string, data: Partial<UserPreferences>): Promise<UserPreferences> {
    const { data: preferences, error } = await this.client
      .from('user_preferences')
      .update(data)
      .eq('userId', userId)
      .select()
      .single();

    if (error) throw error;
    return preferences;
  }

  async deleteUserPreferences(userId: string): Promise<void> {
    const { error } = await this.client
      .from('user_preferences')
      .delete()
      .eq('userId', userId);

    if (error) throw error;
  }

  // Activity log operations
  async createActivityLog(data: Omit<ActivityLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<ActivityLog> {
    const { data: log, error } = await this.client
      .from('activity_logs')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return log;
  }

  async getUserActivityLogs(userId: string, options?: { limit?: number; offset?: number }): Promise<ActivityLog[]> {
    let query = this.client
      .from('activity_logs')
      .select()
      .eq('userId', userId)
      .order('createdAt', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, (options.offset || 0) + (options.limit || 10) - 1);
    }

    const { data: logs, error } = await query;

    if (error) throw error;
    return logs;
  }

  async deleteUserActivityLogs(userId: string): Promise<void> {
    const { error } = await this.client
      .from('activity_logs')
      .delete()
      .eq('userId', userId);

    if (error) throw error;
  }

  // Relationship operations
  async getUserWithRelations(id: string): Promise<UserWithRelations | null> {
    const { data: user, error } = await this.client
      .from('users')
      .select(`
        *,
        profile:profiles(*),
        preferences:user_preferences(*),
        activityLogs:activity_logs(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return user;
  }
} 