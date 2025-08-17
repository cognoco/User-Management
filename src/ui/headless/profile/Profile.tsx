import { useState } from 'react';
import { useUserProfile } from '@/hooks/user/useUserProfile';
import { UserProfile, ProfileUpdatePayload, UserType } from '@/core/common/user-types';

export interface ProfileProps {
  userId?: string;
  render: (props: {
    profile: UserProfile | null;
    isLoading: boolean;
    isEditing: boolean;
    userType: UserType | null;
    toggleEdit: () => void;
    save: (data: ProfileUpdatePayload) => Promise<void>;
    error: string | null;
  }) => React.ReactNode;
}

/**
 * Headless profile component providing profile data and edit logic
 */
export function Profile({ userId, render }: ProfileProps) {
  const {
    profile,
    isLoading,
    error,
    updateProfile
  } = useUserProfile();

  const [isEditing, setIsEditing] = useState(false);

  const toggleEdit = () => setIsEditing((e) => !e);

  const save = async (data: ProfileUpdatePayload) => {
    const id = userId || profile?.id;
    if (!id) return;
    await updateProfile(id, data);
    setIsEditing(false);
  };

  const userType = profile?.userType ?? null;

  return (
    <>{render({ profile, isLoading, isEditing, userType, toggleEdit, save, error })}</>
  );
}

export default Profile;
