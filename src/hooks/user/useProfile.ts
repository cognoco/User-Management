import { useProfileStore } from '@/lib/stores/profile.store';

interface Profile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  phoneNumber?: string;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  notificationPreferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacySettings: {
    profileVisibility: 'public' | 'private' | 'contacts';
    showEmail: boolean;
    showPhone: boolean;
  };
  connectedAccounts: {
    google?: boolean;
    github?: boolean;
    twitter?: boolean;
  };
}


export const useProfile = () => {
  const store = useProfileStore();
  const { profile, isLoading, updatePrivacySettings } = store;

  return {
    profile,
    isLoading,
    updatePrivacySettings,
    // Add other selected state/actions here if needed
  };
};