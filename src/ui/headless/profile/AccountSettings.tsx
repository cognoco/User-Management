/**
 * Headless Account Settings Component
 * 
 * This component handles the behavior of account settings without any UI rendering.
 * It follows the headless UI pattern using render props to allow complete UI customization.
 */

import { useState, FormEvent, useEffect } from 'react';
import { useUserProfile } from '@/hooks/user/useUserProfile';
import { useAuth } from '@/hooks/auth/useAuth';
import { UserPreferences, PreferencesUpdatePayload, ProfileVisibility, VisibilityLevel } from '@/core/common/user-types';

export interface AccountSettingsProps {
  /**
   * Called when preferences are updated
   */
  onUpdatePreferences?: (preferences: PreferencesUpdatePayload) => Promise<void>;
  
  /**
   * Called when profile visibility is updated
   */
  onUpdateVisibility?: (visibility: ProfileVisibility) => Promise<void>;
  
  /**
   * Custom loading state (if not provided, internal state is used)
   */
  isLoading?: boolean;
  
  /**
   * Custom error message (if not provided, internal state is used)
   */
  error?: string;
  
  /**
   * Custom success message (if not provided, internal state is used)
   */
  successMessage?: string;
  
  /**
   * Render prop function that receives form state and handlers
   */
  render: (props: {
    handleUpdatePreferences: (e: FormEvent) => void;
    handleUpdateVisibility: (e: FormEvent) => void;
    preferences: {
      language: string;
      theme: 'light' | 'dark' | 'system';
      emailNotifications: {
        marketing: boolean;
        securityAlerts: boolean;
        accountUpdates: boolean;
        teamInvitations: boolean;
      };
      pushNotifications: {
        enabled: boolean;
        events: string[];
      };
    };
    visibility: {
      email: VisibilityLevel;
      fullName: VisibilityLevel;
      profilePicture: VisibilityLevel;
      companyInfo: VisibilityLevel;
      lastLogin: VisibilityLevel;
    };
    setPreferenceValue: (field: string, value: any) => void;
    setEmailNotificationValue: (field: string, value: boolean) => void;
    setPushNotificationValue: (field: string, value: any) => void;
    setVisibilityValue: (field: string, value: VisibilityLevel) => void;
    isSubmitting: boolean;
    errors: {
      preferences?: string;
      visibility?: string;
      form?: string;
    };
    successMessage?: string;
    availableLanguages: { code: string; name: string }[];
    availableThemes: { value: 'light' | 'dark' | 'system'; label: string }[];
    availableVisibilityLevels: { value: VisibilityLevel; label: string }[];
  }) => React.ReactNode;
}

// Available languages
const availableLanguages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
];

// Available themes
const availableThemes = [
  { value: 'light' as const, label: 'Light' },
  { value: 'dark' as const, label: 'Dark' },
  { value: 'system' as const, label: 'System Default' },
];

// Available visibility levels
const availableVisibilityLevels = [
  { value: VisibilityLevel.PUBLIC, label: 'Public (Anyone)' },
  { value: VisibilityLevel.TEAM_ONLY, label: 'Team Only' },
  { value: VisibilityLevel.PRIVATE, label: 'Private (Only Me)' },
];

export function AccountSettings({
  onUpdatePreferences,
  onUpdateVisibility,
  isLoading: externalIsLoading,
  error: externalError,
  successMessage: externalSuccessMessage,
  render
}: AccountSettingsProps) {
  // Get user profile hook
  const { 
    profile, 
    updateProfileVisibility,
    isLoading: profileIsLoading, 
    error: profileError,
    successMessage: profileSuccessMessage
  } = useUserProfile();
  
  // Get current user from auth hook
  const { user } = useAuth();
  
  // Default preferences
  const defaultPreferences = {
    language: 'en',
    theme: 'system' as const,
    emailNotifications: {
      marketing: false,
      securityAlerts: true,
      accountUpdates: true,
      teamInvitations: true,
    },
    pushNotifications: {
      enabled: false,
      events: [],
    },
  };
  
  // Default visibility
  const defaultVisibility = {
    email: VisibilityLevel.TEAM_ONLY,
    fullName: VisibilityLevel.PUBLIC,
    profilePicture: VisibilityLevel.PUBLIC,
    companyInfo: VisibilityLevel.TEAM_ONLY,
    lastLogin: VisibilityLevel.PRIVATE,
  };
  
  // Form state
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [visibility, setVisibility] = useState(defaultVisibility);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    preferences?: string;
    visibility?: string;
    form?: string;
  }>({});
  
  // Use external state if provided, otherwise use internal state
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : profileIsLoading || isSubmitting;
  const formError = externalError !== undefined ? externalError : profileError;
  const formSuccessMessage = externalSuccessMessage !== undefined ? externalSuccessMessage : profileSuccessMessage;
  
  // Update preferences and visibility when profile changes
  useEffect(() => {
    if (profile) {
      // Update preferences if available in profile metadata
      if (profile.metadata?.preferences) {
        const userPrefs = profile.metadata.preferences as UserPreferences;
        setPreferences({
          language: userPrefs.language || defaultPreferences.language,
          theme: userPrefs.theme || defaultPreferences.theme,
          emailNotifications: {
            marketing: userPrefs.emailNotifications?.marketing ?? defaultPreferences.emailNotifications.marketing,
            securityAlerts: userPrefs.emailNotifications?.securityAlerts ?? defaultPreferences.emailNotifications.securityAlerts,
            accountUpdates: userPrefs.emailNotifications?.accountUpdates ?? defaultPreferences.emailNotifications.accountUpdates,
            teamInvitations: userPrefs.emailNotifications?.teamInvitations ?? defaultPreferences.emailNotifications.teamInvitations,
          },
          pushNotifications: {
            enabled: userPrefs.pushNotifications?.enabled ?? defaultPreferences.pushNotifications.enabled,
            events: userPrefs.pushNotifications?.events || defaultPreferences.pushNotifications.events,
          },
        });
      }
      
      // Update visibility if available in profile
      if (profile.visibility) {
        setVisibility({
          email: profile.visibility.email || defaultVisibility.email,
          fullName: profile.visibility.fullName || defaultVisibility.fullName,
          profilePicture: profile.visibility.profilePicture || defaultVisibility.profilePicture,
          companyInfo: profile.visibility.companyInfo || defaultVisibility.companyInfo,
          lastLogin: profile.visibility.lastLogin || defaultVisibility.lastLogin,
        });
      }
    }
  }, [profile]);
  
  // Set a specific preference value
  const setPreferenceValue = (field: string, value: any) => {
    setPreferences((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  
  // Set a specific email notification value
  const setEmailNotificationValue = (field: string, value: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      emailNotifications: {
        ...prev.emailNotifications,
        [field]: value,
      },
    }));
  };
  
  // Set a specific push notification value
  const setPushNotificationValue = (field: string, value: any) => {
    setPreferences((prev) => ({
      ...prev,
      pushNotifications: {
        ...prev.pushNotifications,
        [field]: value,
      },
    }));
  };
  
  // Set a specific visibility value
  const setVisibilityValue = (field: string, value: VisibilityLevel) => {
    setVisibility((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  
  // Handle preferences update
  const handleUpdatePreferences = async (e: FormEvent) => {
    e.preventDefault();
    
    // Reset form error
    setErrors({ ...errors, preferences: undefined, form: undefined });
    
    // Prepare preferences data
    const preferencesData: PreferencesUpdatePayload = {
      language: preferences.language,
      theme: preferences.theme,
      emailNotifications: {
        marketing: preferences.emailNotifications.marketing,
        securityAlerts: preferences.emailNotifications.securityAlerts,
        accountUpdates: preferences.emailNotifications.accountUpdates,
        teamInvitations: preferences.emailNotifications.teamInvitations,
      },
      pushNotifications: {
        enabled: preferences.pushNotifications.enabled,
        events: preferences.pushNotifications.events,
      },
    };
    
    // Submit form
    setIsSubmitting(true);
    
    try {
      if (onUpdatePreferences) {
        // Use custom submit handler
        await onUpdatePreferences(preferencesData);
      } else if (user?.id && profile) {
        // Use default profile hook to update metadata
        const result = await updateProfile(user.id, {
          metadata: {
            ...profile.metadata,
            preferences: preferencesData,
          },
        });
        
        if (result.error) {
          setErrors({ ...errors, preferences: result.error });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update preferences';
      setErrors({ ...errors, preferences: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle visibility update
  const handleUpdateVisibility = async (e: FormEvent) => {
    e.preventDefault();
    
    // Reset form error
    setErrors({ ...errors, visibility: undefined, form: undefined });
    
    // Submit form
    setIsSubmitting(true);
    
    try {
      if (onUpdateVisibility) {
        // Use custom submit handler
        await onUpdateVisibility(visibility);
      } else if (user?.id) {
        // Use default profile hook
        const result = await updateProfileVisibility(user.id, visibility);
        
        if (result.error) {
          setErrors({ ...errors, visibility: result.error });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update visibility settings';
      setErrors({ ...errors, visibility: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // If there's a form error from the profile service, display it
  useEffect(() => {
    if (formError) {
      setErrors({ ...errors, form: formError });
    }
  }, [formError]);
  
  // Render the component using the render prop
  return render({
    handleUpdatePreferences,
    handleUpdateVisibility,
    preferences,
    visibility,
    setPreferenceValue,
    setEmailNotificationValue,
    setPushNotificationValue,
    setVisibilityValue,
    isSubmitting: isLoading,
    errors: {
      ...errors,
      form: errors.form || formError
    },
    successMessage: formSuccessMessage,
    availableLanguages,
    availableThemes,
    availableVisibilityLevels
  });
}

// Helper function to update profile (not exported)
async function updateProfile(_userId: string, _data: any) {
  // This is a placeholder function to avoid circular dependencies
  // In a real implementation, we would use the UserService directly
  return { success: true };
}
