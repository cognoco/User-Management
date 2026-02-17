import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useProfileStore, profileStore } from '@/lib/stores/profile.store';
import { useAuth } from '@/hooks/auth/useAuth';
import { profileSchema, ProfileFormData } from '@/types/profile';
import { api } from '@/lib/api/axios';
import { z } from 'zod';

export interface ProfileFormRenderProps {
  profile: any | null;
  isLoading: boolean;
  isPrivacyLoading: boolean;
  isEditing: boolean;
  errors: Record<string, any>;
  isDirty: boolean;
  register: (...args: any[]) => any;
  watch: (...args: any[]) => any;
  handleSubmit: (onSubmit: (data: ProfileFormData) => Promise<void>) => (e: React.FormEvent) => void;
  handleEditToggle: () => void;
  handlePrivacyChange: (checked: boolean) => Promise<any>;
  onSubmit: (data: ProfileFormData) => Promise<void>;
  userEmail: string | undefined;
}

export interface ProfileFormProps {
  children: (props: ProfileFormRenderProps) => React.ReactNode;
}

/**
 * Headless ProfileForm component that contains all the business logic for profile form management.
 * Follows the render props pattern to allow for custom UI implementation.
 */
export default function ProfileForm({ children }: ProfileFormProps) {
  const { profile, isLoading: isProfileLoading, fetchProfile, updateProfile, error } = useProfileStore();

  const userEmail = useAuth().user?.email;

  const [isEditing, setIsEditing] = useState(false);
  const [isPrivacyLoading, setIsPrivacyLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<
    z.input<typeof profileSchema> & { is_public?: boolean },
    any,
    z.output<typeof profileSchema> & { is_public?: boolean }
  >({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      bio: '',
      gender: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postal_code: '',
      phone_number: '',
      website: '',
      is_public: true,
    },
  });

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (profile) {
      const p = profile as any;
      // Support both flat (Profile from profile.ts) and nested (DbProfile from database.ts) shapes
      reset({
        bio: p.bio ?? '',
        gender: p.gender ?? '',
        address: typeof p.address === 'string' ? p.address : (p.address?.street_line1 ?? ''),
        city: p.city ?? p.address?.city ?? '',
        state: p.state ?? p.address?.state ?? '',
        country: p.country ?? p.address?.country ?? '',
        postal_code: p.postal_code ?? p.address?.postal_code ?? '',
        phone_number: p.phone_number ?? p.phoneNumber ?? '',
        website: p.website ?? '',
        is_public: p.is_public ?? (p.privacySettings?.profileVisibility === 'public') ?? true,
      });
    }
  }, [profile, reset, isEditing]);

  const handleEditToggle = useCallback(() => {
    setIsEditing((prev) => !prev);
  }, []);

  const onSubmit = useCallback(
    async (data: ProfileFormData) => {
      try {
        await updateProfile(data as any);
        // If no error in store after update, close edit mode
        if (!profileStore.getState().error) {
          setIsEditing(false);
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error updating profile:', err);
        }
      }
    },
    [updateProfile],
  );

  const handlePrivacyChange = useCallback(
    async (checked: boolean) => {
      setIsPrivacyLoading(true);
      try {
        const response = await api.put('/api/profile/privacy', { is_public: checked });
        setValue('is_public', response.data.is_public, { shouldDirty: false });
        profileStore.setState((state) => ({
          ...state,
          profile: state.profile ? { ...state.profile, is_public: response.data.is_public } : null,
        }));
        return response.data;
      } catch (err: any) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Privacy update error:', err);
        }
        throw err;
      } finally {
        setIsPrivacyLoading(false);
      }
    },
    [setValue],
  );

  return children({
    profile,
    isLoading: isProfileLoading,
    isPrivacyLoading,
    isEditing,
    errors,
    isDirty,
    register,
    watch,
    handleSubmit: (onSubmitFn) => handleSubmit(onSubmitFn),
    handleEditToggle,
    handlePrivacyChange,
    onSubmit,
    userEmail,
  });
}
