/**
 * User Profile Hook
 * 
 * This hook provides user profile management functionality.
 * It follows the architecture principles by connecting the UI layer to the service layer.
 */

import { useState, useEffect, useCallback } from 'react';
import { UserService } from '@/core/user/interfaces';
import { 
  UserProfile, 
  ProfileUpdatePayload, 
  UserProfileResult, 
  ProfileVisibility 
} from '@/core/user/models';
import { UserManagementConfiguration } from '@/core/config';
import { useAuth } from '../auth/useAuth';

/**
 * Hook for user profile management functionality
 * 
 * @returns User profile state and methods
 */
export function useUserProfile() {
  // Get the user service from the service provider registry
  const userService = UserManagementConfiguration.getServiceProvider<UserService>('userService');
  
  if (!userService) {
    throw new Error('UserService is not registered in the service provider registry');
  }
  
  // Get current user from auth hook
  const { user } = useAuth();
  
  // Local state for user profile
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Fetch user profile
  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    if (!userId) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const userProfile = await userService.getUserProfile(userId);
      
      setIsLoading(false);
      setProfile(userProfile);
      
      return userProfile;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user profile';
      
      setIsLoading(false);
      setError(errorMessage);
      
      return null;
    }
  }, [userService]);
  
  // Update user profile
  const updateProfile = useCallback(async (userId: string, profileData: ProfileUpdatePayload): Promise<UserProfileResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await userService.updateUserProfile(userId, profileData);
      
      setIsLoading(false);
      
      if (result.success && result.profile) {
        setProfile(result.profile);
        setSuccessMessage('Profile updated successfully');
      } else if (result.error) {
        setError(result.error);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      
      setIsLoading(false);
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [userService]);
  
  // Upload profile picture
  const uploadProfilePicture = useCallback(async (userId: string, imageData: Blob): Promise<{ success: boolean; imageUrl?: string; error?: string }> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await userService.uploadProfilePicture(userId, imageData);
      
      setIsLoading(false);
      
      if (result.success && result.imageUrl) {
        // Update the profile with the new image URL
        if (profile) {
          setProfile({
            ...profile,
            profilePictureUrl: result.imageUrl
          });
        }
        setSuccessMessage('Profile picture uploaded successfully');
      } else if (result.error) {
        setError(result.error);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload profile picture';
      
      setIsLoading(false);
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [userService, profile]);
  
  // Delete profile picture
  const deleteProfilePicture = useCallback(async (userId: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await userService.deleteProfilePicture(userId);
      
      setIsLoading(false);
      
      if (result.success) {
        // Update the profile to remove the image URL
        if (profile) {
          setProfile({
            ...profile,
            profilePictureUrl: undefined
          });
        }
        setSuccessMessage('Profile picture deleted successfully');
      } else if (result.error) {
        setError(result.error);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete profile picture';
      
      setIsLoading(false);
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [userService, profile]);
  
  // Update profile visibility
  const updateProfileVisibility = useCallback(async (userId: string, visibility: ProfileVisibility): Promise<{ success: boolean; visibility?: ProfileVisibility; error?: string }> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await userService.updateProfileVisibility(userId, visibility);
      
      setIsLoading(false);
      
      if (result.success && result.visibility) {
        // Update the profile with the new visibility settings
        if (profile) {
          setProfile({
            ...profile,
            visibility: result.visibility
          });
        }
        setSuccessMessage('Profile visibility updated successfully');
      } else if (result.error) {
        setError(result.error);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile visibility';
      
      setIsLoading(false);
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [userService, profile]);
  
  // Clear any error or success messages
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);
  
  // Fetch the current user's profile when the component mounts or the user changes
  useEffect(() => {
    if (user?.id) {
      fetchUserProfile(user.id);
    }
  }, [user, fetchUserProfile]);
  
  // Subscribe to profile changes
  useEffect(() => {
    if (!userService) return () => {};
    
    const unsubscribe = userService.onUserProfileChanged((updatedProfile) => {
      // Only update if it's the current user's profile
      if (user?.id && updatedProfile.id === user.id) {
        setProfile(updatedProfile);
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [userService, user]);
  
  return {
    // State
    profile,
    isLoading,
    error,
    successMessage,
    
    // Methods
    fetchUserProfile,
    updateProfile,
    uploadProfilePicture,
    deleteProfilePicture,
    updateProfileVisibility,
    clearMessages
  };
}

export default useUserProfile;
