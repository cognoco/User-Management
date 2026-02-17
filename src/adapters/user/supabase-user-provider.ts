/**
 * Supabase User Provider Implementation
 * 
 * This file implements the UserDataProvider interface using Supabase.
 * It adapts Supabase's database API to the interface required by our core business logic.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  UserProfile, 
  ProfileUpdatePayload, 
  UserPreferences,
  PreferencesUpdatePayload,
  UserProfileResult,
  UserSearchParams,
  UserSearchResult,
  ProfileVisibility
} from '@/core/user/models';

import type { IUserDataProvider } from '@/core/user/IUserDataProvider';


/**
 * Supabase implementation of the UserDataProvider interface
 */
export class SupabaseUserProvider implements IUserDataProvider {
  private supabase: SupabaseClient;
  private profileCallbacks: ((profile: UserProfile) => void)[] = [];
  
  /**
   * Create a new SupabaseUserProvider instance
   * 
   * @param supabaseUrl Supabase project URL
   * @param supabaseKey Supabase API key
   */
  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    // Set up realtime subscription for profile changes
    // This would require setting up Supabase realtime subscriptions
  }
  
  /**
   * Get the profile of a user by ID
   * 
   * @param userId ID of the user to fetch
   * @returns User profile data or null if not found
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return this.mapDbProfileToUserProfile(data);
  }
  
  /**
   * Update a user's profile
   * 
   * @param userId ID of the user to update
   * @param profileData Updated profile data
   * @returns Result object with success status and updated profile or error
   */
  async updateUserProfile(userId: string, profileData: ProfileUpdatePayload): Promise<UserProfileResult> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .update({
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          display_name: profileData.displayName,
          bio: profileData.bio,
          location: profileData.location,
          website: profileData.website,
          avatar_url: profileData.avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        return {
          success: false,
          error: error.message
        };
      }
      
      const updatedProfile = this.mapDbProfileToUserProfile(data);
      
      // Notify subscribers
      this.notifyProfileChanged(updatedProfile);
      
      return {
        success: true,
        profile: updatedProfile
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An error occurred while updating profile'
      };
    }
  }
  
  /**
   * Get a user's preferences
   * 
   * @param userId ID of the user to fetch preferences for
   * @returns User preferences or default preferences if not set
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const { data, error } = await this.supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      // Return default preferences if not found
      return {
        theme: 'light',
        language: 'en',
        emailNotifications: {
          marketing: false,
          securityAlerts: true,
          accountUpdates: true,
          teamInvitations: true,
        },
        pushNotifications: {
          enabled: true,
          events: [],
        },
      };
    }
    
    return this.mapDbPreferencesToUserPreferences(data);
  }
  
  /**
   * Update a user's preferences
   * 
   * @param userId ID of the user to update preferences for
   * @param preferences Updated preferences data
   * @returns Result object with success status and updated preferences or error
   */
  async updateUserPreferences(userId: string, preferences: PreferencesUpdatePayload): Promise<{ success: boolean; preferences?: UserPreferences; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          theme: preferences.theme,
          language: preferences.language,
          push_notifications: preferences.pushNotifications,
          email_notifications: preferences.emailNotifications,
          timezone: preferences.timezone,
          date_format: preferences.dateFormat,
          time_format: preferences.timeFormat,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        return {
          success: false,
          error: error.message
        };
      }
      
      return {
        success: true,
        preferences: this.mapDbPreferencesToUserPreferences(data)
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An error occurred while updating preferences'
      };
    }
  }
  
  /**
   * Upload a profile picture for a user
   * 
   * @param userId ID of the user
   * @param imageData Image data as a File or Blob
   * @returns Result object with success status and image URL or error
   */
  async uploadProfilePicture(userId: string, imageData: Blob): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    try {
      const fileName = `avatar-${userId}-${Date.now()}`;
      
      // Upload the image to Supabase Storage
      const { data, error } = await this.supabase
        .storage
        .from('avatars')
        .upload(fileName, imageData, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) {
        return {
          success: false,
          error: error.message
        };
      }
      
      // Get the public URL for the uploaded image
      const { data: { publicUrl } } = this.supabase
        .storage
        .from('avatars')
        .getPublicUrl(data.path);
      
      // Update the user's profile with the new avatar URL
      await this.updateUserProfile(userId, { avatarUrl: publicUrl });
      
      return {
        success: true,
        imageUrl: publicUrl
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An error occurred while uploading profile picture'
      };
    }
  }
  
  /**
   * Delete a user's profile picture
   * 
   * @param userId ID of the user
   * @returns Result object with success status or error
   */
  async deleteProfilePicture(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get the current profile to find the avatar filename
      const profile = await this.getUserProfile(userId);
      
      if (!profile || !profile.avatarUrl) {
        return {
          success: false,
          error: 'No profile picture found'
        };
      }
      
      // Extract the filename from the URL
      const urlParts = profile.avatarUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      // Delete the file from Supabase Storage
      const { error } = await this.supabase
        .storage
        .from('avatars')
        .remove([fileName]);
      
      if (error) {
        return {
          success: false,
          error: error.message
        };
      }
      
      // Update the user's profile to remove the avatar URL
      await this.updateUserProfile(userId, { avatarUrl: undefined });
      
      return {
        success: true
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An error occurred while deleting profile picture'
      };
    }
  }
  
  /**
   * Update a user's profile visibility settings
   * 
   * @param userId ID of the user
   * @param visibility Profile visibility settings
   * @returns Result object with success status and updated visibility settings or error
   */
  async updateProfileVisibility(userId: string, visibility: ProfileVisibility): Promise<{ success: boolean; visibility?: ProfileVisibility; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('profile_visibility')
        .upsert({
          user_id: userId,
          email_visible: visibility.emailVisible,
          name_visible: visibility.nameVisible,
          bio_visible: visibility.bioVisible,
          location_visible: visibility.locationVisible,
          website_visible: visibility.websiteVisible,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        return {
          success: false,
          error: error.message
        };
      }
      
      return {
        success: true,
        visibility: {
          email: data.email_visible ? 'public' : 'private',
          fullName: data.name_visible ? 'public' : 'private',
          profilePicture: 'public',
          companyInfo: 'private',
          lastLogin: 'private',
          emailVisible: data.email_visible,
          nameVisible: data.name_visible,
          bioVisible: data.bio_visible,
          locationVisible: data.location_visible,
          websiteVisible: data.website_visible,
        } as ProfileVisibility
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An error occurred while updating profile visibility'
      };
    }
  }
  
  /**
   * Search for users based on search parameters
   * 
   * @param params Search parameters
   * @returns Search results with pagination
   */
  async searchUsers(params: UserSearchParams): Promise<UserSearchResult> {
    try {
      let query = this.supabase
        .from('profiles')
        .select('*', { count: 'exact' });
      
      // Apply search filters
      if (params.query) {
        query = query.or(`first_name.ilike.%${params.query}%,last_name.ilike.%${params.query}%,display_name.ilike.%${params.query}%,email.ilike.%${params.query}%`);
      }
      
      if (params.filters) {
        if (params.filters.location) {
          query = query.ilike('location', `%${params.filters.location}%`);
        }
        
        if (params.filters.isActive !== undefined) {
          query = query.eq('is_active', params.filters.isActive);
        }
      }
      
      // Apply pagination
      const page = params.page ?? 0;
      const pageSize = params.pageSize ?? 20;
      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      query = query.range(from, to);
      
      // Apply sorting
      if (params.sortBy) {
        const direction = params.sortDirection === 'desc' ? 'desc' : 'asc';
        query = query.order(params.sortBy, { ascending: direction === 'asc' });
      } else {
        query = query.order('created_at', { ascending: false });
      }
      
      const { data, error, count } = await query;
      
      if (error) {
        throw new Error(error.message);
      }
      
      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);
      
      const users = data.map(this.mapDbProfileToUserProfile);
      
      return {
        users,
        total: totalCount,
        page,
        limit: pageSize,
        totalPages,
      };
    } catch (error: any) {
      return {
        users: [],
        total: 0,
        page: params.page ?? 0,
        limit: params.pageSize ?? 20,
        totalPages: 0,
      };
    }
  }
  
  /**
   * Deactivate a user account
   * 
   * @param userId ID of the user to deactivate
   * @param reason Optional reason for deactivation
   * @returns Result object with success status or error
   */
  async deactivateUser(userId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('profiles')
        .update({
          is_active: false,
          deactivation_reason: reason,
          deactivated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      if (error) {
        return {
          success: false,
          error: error.message
        };
      }
      
      return {
        success: true
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An error occurred while deactivating user'
      };
    }
  }
  
  /**
   * Reactivate a previously deactivated user account
   * 
   * @param userId ID of the user to reactivate
   * @returns Result object with success status or error
   */
  async reactivateUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('profiles')
        .update({
          is_active: true,
          deactivation_reason: null,
          deactivated_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      if (error) {
        return {
          success: false,
          error: error.message
        };
      }
      
      return {
        success: true
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An error occurred while reactivating user'
      };
    }
  }
  
  /**
   * Convert a user's account type (e.g., from private to corporate)
   * 
   * @param userId ID of the user
   * @param newType New account type
   * @param additionalData Additional data required for the new account type
   * @returns Result object with success status and updated profile or error
   */
  async convertUserType(userId: string, newType: string, additionalData?: Record<string, any>): Promise<UserProfileResult> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .update({
          account_type: newType,
          account_data: additionalData,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        return {
          success: false,
          error: error.message
        };
      }
      
      const updatedProfile = this.mapDbProfileToUserProfile(data);
      
      // Notify subscribers
      this.notifyProfileChanged(updatedProfile);
      
      return {
        success: true,
        profile: updatedProfile
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An error occurred while converting user type'
      };
    }
  }
  
  /**
   * Subscribe to user profile changes
   * 
   * @param callback Function to call when a user profile changes
   * @returns Unsubscribe function
   */
  onUserProfileChanged(callback: (profile: UserProfile) => void): () => void {
    this.profileCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.profileCallbacks.indexOf(callback);
      if (index !== -1) {
        this.profileCallbacks.splice(index, 1);
      }
    };
  }
  
  /**
   * Notify all profile change callbacks
   * 
   * @param profile Updated user profile
   */
  private notifyProfileChanged(profile: UserProfile): void {
    for (const callback of this.profileCallbacks) {
      callback(profile);
    }
  }
  
  /**
   * Map a database profile record to a UserProfile model
   * 
   * @param dbProfile Database profile record
   * @returns UserProfile model
   */
  private mapDbProfileToUserProfile(dbProfile: any): UserProfile {
    return {
      id: dbProfile.user_id || dbProfile.id,
      email: dbProfile.email,
      firstName: dbProfile.first_name,
      lastName: dbProfile.last_name,
      fullName: dbProfile.display_name || [dbProfile.first_name, dbProfile.last_name].filter(Boolean).join(' ') || undefined,
      avatarUrl: dbProfile.avatar_url,
      isActive: dbProfile.is_active ?? true,
      isVerified: dbProfile.is_verified ?? false,
      userType: dbProfile.account_type || 'private',
      createdAt: dbProfile.created_at ? new Date(dbProfile.created_at).toISOString() : undefined,
      updatedAt: dbProfile.updated_at ? new Date(dbProfile.updated_at).toISOString() : undefined,
    };
  }
  
  /**
   * Map a database preferences record to a UserPreferences model
   * 
   * @param dbPreferences Database preferences record
   * @returns UserPreferences model
   */
  private mapDbPreferencesToUserPreferences(dbPreferences: any): UserPreferences {
    return {
      theme: dbPreferences.theme || 'light',
      language: dbPreferences.language || 'en',
      emailNotifications: dbPreferences.email_notifications || {
        marketing: false,
        securityAlerts: true,
        accountUpdates: true,
        teamInvitations: true,
      },
      pushNotifications: dbPreferences.push_notifications || {
        enabled: true,
        events: [],
      },
      additionalSettings: {
        timezone: dbPreferences.timezone,
        dateFormat: dbPreferences.date_format,
        timeFormat: dbPreferences.time_format,
      },
    };
  }
}
