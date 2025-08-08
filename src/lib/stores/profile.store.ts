import { create } from 'zustand';
import { api } from '@/lib/api/axios';
// Supabase must not be used from client; rely on API
import {
    ProfileState,
} from '@/types/profile';
import { fileToBase64 } from '@/lib/utils/file-upload';
import { useAuth } from '@/lib/hooks/useAuth';

import { Profile as DbProfile } from '@/types/database';
import type { ProfileVerification } from '@/types/profile';

interface ExtendedProfileState extends Omit<ProfileState, 'profile' | 'updateProfile'> {
  profile: DbProfile | null;
  fetchProfile: () => Promise<void>;
  updateBusinessProfile: (data: Partial<DbProfile>) => Promise<void>;
  updateProfile: (data: Partial<DbProfile>) => Promise<void>;
  convertToBusinessProfile: (businessId: string) => Promise<void>;
  uploadAvatar: (fileOrBase64: File | string) => Promise<string | null>;
  removeAvatar: () => Promise<boolean>;
  uploadCompanyLogo: (fileOrBase64: File | string) => Promise<string | null>;
  removeCompanyLogo: () => Promise<boolean>;
  clearError: () => void;
}

type ProfileInternalState = Omit<ExtendedProfileState, 'fetchProfile'> & {
  fetchProfile: (userId: string | undefined) => Promise<void>;
};

const profileStoreBase = create<ProfileInternalState & {
  verification: ProfileVerification | null;
  verificationLoading: boolean;
  verificationError: string | null;
  fetchVerificationStatus: () => Promise<void>;
  requestVerification: (document?: File) => Promise<void>;
}>()((set, get) => ({
  profile: null,
  isLoading: false,
  error: null,
  verification: null,
  verificationLoading: false,
  verificationError: null,

  fetchProfile: async (userId: string | undefined) => {
    set({ isLoading: true, error: null });
    if (!userId) {
      set({ error: 'User not authenticated', isLoading: false });
      return;
    }

    try {
      let profileData: DbProfile | null = null;
      try {
          const response = await api.get('/api/profile/business');
          profileData = response.data as DbProfile;
      } catch (businessError: any) {
          console.log('Failed to fetch business profile, trying fallback...', businessError.response?.status);
          try {
             const fb = await api.get(`/api/profile/personal?userId=${encodeURIComponent(userId)}`);
             profileData = fb.data as DbProfile;
          } catch (fallbackError) {
             console.error("Error fetching profile fallback:", fallbackError);
             if (businessError.response?.status && businessError.response?.status !== 403 && businessError.response?.status !== 404) {
                 throw businessError;
             }
             throw new Error('Failed to fetch profile data.'); 
          }
      }
      
      if (!profileData) {
          throw new Error('No profile data found after multiple attempts.');
      }

      set({ profile: profileData, isLoading: false });

    } catch (error: any) {
      console.error("Fetch profile error:", error);
      set({
        error: error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch profile',
        isLoading: false,
      });
    }
  },

  updateBusinessProfile: async (data: Partial<DbProfile>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.patch('/api/profile/business', data);
      set({ profile: response.data as DbProfile, isLoading: false });
    } catch (error: any) {
      console.error("Update business profile error:", error);
      set({
        error: error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to update business profile',
        isLoading: false,
      });
    }
  },

  updateProfile: async (data: Partial<DbProfile>) => {
    set({ isLoading: true, error: null });
    console.warn('Using generic updateProfile. Consider using specific update actions like updateBusinessProfile.');
    try {
      const response = await api.patch('/api/profile/personal', data);
      set({ profile: response.data as DbProfile, isLoading: false });
    } catch (error: any) {
      console.error("Generic update profile error:", error);
      set({
        error: error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to update profile',
        isLoading: false,
      });
    }
  },

  convertToBusinessProfile: async (businessId: string) => {
    set({ isLoading: true, error: null });
    const currentProfile = get().profile;
    if (!currentProfile) {
      set({ error: 'Cannot convert profile: Profile not loaded.', isLoading: false });
      throw new Error('Profile not loaded');
    }

    try {
      const response = await api.post('/api/profile/convert-to-business', { businessId });
      
      set({
        profile: response.data as DbProfile,
        isLoading: false,
      });

    } catch (error: any) {
      console.error("Convert to business profile error:", error);
      set({
        error: error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to convert profile type',
        isLoading: false,
      });
      throw error; 
    }
  },

  uploadCompanyLogo: async (fileOrBase64: File | string): Promise<string | null> => {
    set({ isLoading: true, error: null });
    try {
      let base64Image: string;
      let filename: string | undefined;
      if (fileOrBase64 instanceof File) {
        base64Image = await fileToBase64(fileOrBase64);
        filename = fileOrBase64.name;
      } else {
        base64Image = fileOrBase64;
      }
      const response = await api.post('/api/profile/logo', {
        logo: base64Image,
        filename
      });
      const newLogoUrl = response.data.companyLogoUrl;
      set((state) => ({
        profile: state.profile ? { ...state.profile, companyLogoUrl: newLogoUrl } : null,
        isLoading: false
      }));
      return newLogoUrl;
    } catch (error: any) {
      console.error("Upload company logo error:", error);
      set({
        error: error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to upload company logo',
        isLoading: false
      });
      return null;
    }
  },

  removeCompanyLogo: async (): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      await api.delete('/api/profile/logo');
      set((state) => ({
        profile: state.profile ? { ...state.profile, companyLogoUrl: null } : null,
        isLoading: false
      }));
      return true;
    } catch (error: any) {
      console.error("Remove company logo error:", error);
      set({
        error: error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to remove company logo',
        isLoading: false
      });
      return false;
    }
  },

  uploadAvatar: async (fileOrBase64: File | string): Promise<string | null> => {
    try {
      set({ isLoading: true, error: null });
      
      let payload: { avatar?: string; avatarId?: string; filename?: string };
      
      if (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('avatar')) {
        // This is a predefined avatar ID
        payload = { avatarId: fileOrBase64 };
      } else {
        // This is a custom uploaded image
        let base64Image: string;
        let filename: string | undefined;
        
        if (fileOrBase64 instanceof File) {
          base64Image = await fileToBase64(fileOrBase64);
          filename = fileOrBase64.name;
        } else {
          base64Image = fileOrBase64;
        }
        
        payload = { avatar: base64Image, filename };
      }
      
      const response = await api.post('/api/profile/avatar', payload);
      
      const newAvatarUrl = response.data.avatarUrl;
      set((state) => ({
        profile: state.profile ? { ...state.profile, avatarUrl: newAvatarUrl } : null,
        isLoading: false
      }));
      
      return newAvatarUrl;
    } catch (error: any) {
      console.error("Upload avatar error:", error);
      set({
        error: error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to upload avatar',
        isLoading: false
      });
      return null;
    }
  },

  removeAvatar: async (): Promise<boolean> => {
    try {
      set({ isLoading: true, error: null });
      await api.delete('/api/profile/avatar');
      
      set((state) => ({
        profile: state.profile ? { ...state.profile, avatarUrl: null } : null,
        isLoading: false
      }));
      
      return true;
    } catch (error: any) {
      console.error("Remove avatar error:", error);
      set({
        error: error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to remove avatar',
        isLoading: false
      });
      return false;
    }
  },

  clearError: () => {
    set({ error: null });
  },

  fetchVerificationStatus: async () => {
    set({ verificationLoading: true, verificationError: null });
    try {
      const response = await api.get('/api/profile/verify');
      set({ verification: response.data.status, verificationLoading: false });
    } catch (error: any) {
      set({
        verificationError: error.response?.data?.error || error.message || 'Failed to fetch verification status',
        verificationLoading: false,
      });
    }
  },

  requestVerification: async (document?: File) => {
    set({ verificationLoading: true, verificationError: null });
    try {
      let response;
      if (document) {
        const formData = new FormData();
        formData.append('document', document);
        response = await api.post('/api/profile/verify', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        response = await api.post('/api/profile/verify');
      }
      set({ verification: response.data.result, verificationLoading: false });
    } catch (error: any) {
      set({
        verificationError: error.response?.data?.error || error.message || 'Failed to request verification',
        verificationLoading: false,
      });
    }
  },
}));

export function useProfileStore() {
  const store = profileStoreBase();
  const { user } = useAuth();

  return {
    ...store,
    fetchProfile: () => store.fetchProfile(user?.id),
  };
}
