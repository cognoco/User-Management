import { create } from 'zustand';
import { getSupabaseClient } from '../supabase';

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  phone_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UserSettings {
  theme: string;
  language: string;
  email_notifications: boolean;
  push_notifications: boolean;
  two_factor_auth: boolean;
  login_alerts: boolean;
  preferences: Record<string, unknown>;
}

interface AuditLogFilters {
  startDate?: string;
  endDate?: string;
  userId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  hasError?: boolean;
  page: number;
  limit: number;
  sortBy: 'timestamp' | 'status_code' | 'response_time';
  sortOrder: 'asc' | 'desc';
}

interface UserState {
  profile: UserProfile | null;
  settings: UserSettings | null;
  isLoading: boolean;
  error: string | null;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  updateSettings: (data: Partial<UserSettings>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  fetchProfile: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  fetchUserAuditLogs: (filters: AuditLogFilters) => Promise<{
    logs: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>;
  exportUserAuditLogs: (
    filters: Omit<AuditLogFilters, 'page' | 'limit'>,
    format?: 'csv' | 'json' | 'xlsx' | 'pdf'
  ) => Promise<Blob>;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  settings: null,
  isLoading: false,
  error: null,

  updateProfile: async (data) => {
    try {
      set({ isLoading: true, error: null });

      const client = await getSupabaseClient();
      const { data: user, error } = await client.auth.getUser();
      if (error) throw error;

      const { error: updateError } = await client
        .from('profiles')
        .update(data)
        .eq('id', user.user.id);

      if (updateError) throw updateError;

      set((state) => ({
        profile: state.profile ? { ...state.profile, ...data } : null,
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.response?.data?.message || (err instanceof Error ? err.message : 'Failed to update profile') });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  updateSettings: async (data) => {
    try {
      set({ isLoading: true, error: null });

      const client = await getSupabaseClient();
      const { data: user, error } = await client.auth.getUser();
      if (error) throw error;

      const { error: updateError } = await client
        .from('user_settings')
        .update(data)
        .eq('user_id', user.user.id);

      if (updateError) throw updateError;

      set((state) => ({
        settings: state.settings ? { ...state.settings, ...data } : null,
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.response?.data?.message || (err instanceof Error ? err.message : 'Failed to update settings') });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  uploadAvatar: async (file) => {
    try {
      set({ isLoading: true, error: null });

      const client = await getSupabaseClient();
      const { data: user, error: userError } = await client.auth.getUser();
      if (userError) throw userError;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await client.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = client.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      await get().updateProfile({ avatar_url: publicUrl });

      return publicUrl;
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.response?.data?.message || (err instanceof Error ? err.message : 'Failed to upload avatar') });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProfile: async () => {
    try {
      set({ isLoading: true, error: null });

      const client = await getSupabaseClient();
      const { data: user, error: userError } = await client.auth.getUser();
      if (userError) throw userError;

      const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('*')
        .eq('id', user.user.id)
        .single();

      if (profileError) throw profileError;

      set({ profile });
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.response?.data?.message || (err instanceof Error ? err.message : 'Failed to fetch profile') });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchSettings: async () => {
    try {
      set({ isLoading: true, error: null });

      const client = await getSupabaseClient();
      const { data: user, error: userError } = await client.auth.getUser();
      if (userError) throw userError;

      const { data: settings, error: settingsError } = await client
        .from('user_settings')
        .select('*')
        .eq('user_id', user.user.id)
        .single();

      if (settingsError) throw settingsError;

      set({ settings });
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.response?.data?.message || (err instanceof Error ? err.message : 'Failed to fetch settings') });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchUserAuditLogs: async (filters) => {
    try {
      set({ isLoading: true, error: null });

      const client = await getSupabaseClient();
      const { data: user, error: userError } = await client.auth.getUser();
      if (userError) throw userError;

      // Build query parameters
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
      // Always filter by current user
      params.append('userId', user.user.id);

      const response = await fetch(`/api/audit/user-actions?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch audit logs');
      }

      const data = await response.json();
      return data;
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch audit logs' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  exportUserAuditLogs: async (filters, format = 'csv') => {
    try {
      set({ isLoading: true, error: null });

      const { data: user, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      // Build query parameters
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
      // Always filter by current user
      params.append('userId', user.user.id);
      params.append('format', format);

      const response = await fetch(`/api/audit/user-actions/export?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to export audit logs');
      }

      return response.blob();
    } catch (err: any) {
      set({ error: err.message || 'Failed to export audit logs' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },
})); 