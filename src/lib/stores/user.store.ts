import { create } from 'zustand';
// Client store must not import supabase; use API routes instead

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
      const res = await fetch('/api/profile/personal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || e?.message || 'Failed to update profile');
      }

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
      const res = await fetch('/api/profile/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || e?.message || 'Failed to update settings');
      }

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
      const formData = new FormData();
      formData.append('document', file);
      // Our avatar API expects base64 or predefined id; use base64 for now
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: base64, filename: file.name }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || e?.message || 'Failed to upload avatar');
      }
      const dataResp = await res.json();
      const publicUrl = dataResp?.avatarUrl as string;
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
      const res = await fetch('/api/profile');
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || e?.message || 'Failed to fetch profile');
      }
      const profile = await res.json();
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
      const res = await fetch('/api/profile/preferences');
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || e?.message || 'Failed to fetch settings');
      }
      const settings = await res.json();
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
      // Build query parameters
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
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