/**
 * Default User Service Implementation
 * 
 * This file implements the UserService interface defined in the core layer.
 * It provides the default implementation for user management operations.
 */

import {
  UserService
} from '@/core/user/interfaces';
import type { UserDataProvider } from '@/core/user/IUserDataProvider';
import {
  UserProfile,
  ProfileUpdatePayload,
  UserPreferences,
  PreferencesUpdatePayload,
  UserProfileResult,
  UserSearchParams,
  UserSearchResult,
  ProfileVisibility
} from '@/core/common/user-types';
import type {
  FileUploadOptions,
  FileUploadResult,
  FileDeleteResult
} from '@/core/storage/interfaces';
import { UserEventType } from '@/core/user/events';
import { TypedEventEmitter } from '@/lib/utils/typed-event-emitter';
import { MemoryCache, getFromBrowser, setInBrowser, removeFromBrowser } from '@/lib/cache';
import { handleServiceError } from '@/services/common/service-error-handler';
import { ERROR_CODES } from '@/core/common/error-codes';

/**
 * Default implementation of the UserService interface
 */
export class DefaultUserService
  extends TypedEventEmitter<UserEventType>
  implements UserService
{
  private static profileCache = new MemoryCache<string, UserProfile | null>({ ttl: 60_000 });
  private static preferencesCache = new MemoryCache<string, UserPreferences>({ ttl: 60_000 });
  
  /**
   * Constructor for DefaultUserService
   *
   * @param userDataProvider - The data provider for user operations
   */
  constructor(private userDataProvider: UserDataProvider) {
    super();
  }

  /**
   * Emit a user event
   * 
   * @param event - The event to emit
   */
  private emitEvent(event: UserEventType): void {
    this.emit(event);
  }

  /**
   * Get the profile of a user by ID
   * 
   * @param userId - ID of the user to fetch
   * @returns User profile data or null if not found
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      return await DefaultUserService.profileCache.getOrCreate(userId, () =>
        this.userDataProvider.getUserProfile(userId)
      );
    } catch (error) {
      const { error: err } = handleServiceError(error, {
        service: 'DefaultUserService',
        method: 'getUserProfile',
        resourceType: 'user',
        resourceId: userId,
      }, ERROR_CODES.NOT_FOUND);
      DefaultUserService.profileCache.delete(userId);
      throw err;
    }
  }

  /**
   * Update a user's profile
   * 
   * @param userId - ID of the user to update
   * @param profileData - Updated profile data
   * @returns Result object with success status and updated profile or error
   */
  async updateUserProfile(userId: string, profileData: ProfileUpdatePayload): Promise<UserProfileResult> {
    const result = await this.userDataProvider.updateUserProfile(userId, profileData);
    if (result.success && result.profile) {
      this.emitEvent({
        type: 'user_profile_updated',
        timestamp: Date.now(),
        userId,
        profile: result.profile,
        updatedFields: Object.keys(profileData)
      });
      DefaultUserService.profileCache.set(userId, result.profile);
    } else {
      DefaultUserService.profileCache.delete(userId);
    }
    return result;
  }

  /**
   * Get a user's preferences
   * 
   * @param userId - ID of the user to fetch preferences for
   * @returns User preferences or default preferences if not set
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const localKey = `um_pref_${userId}`;
    const fromLocal = getFromBrowser<UserPreferences>(localKey);
    if (fromLocal) {
      DefaultUserService.preferencesCache.set(userId, fromLocal);
      return fromLocal;
    }
    const prefs = await DefaultUserService.preferencesCache.getOrCreate(userId, () =>
      this.userDataProvider.getUserPreferences(userId)
    );
    setInBrowser(localKey, prefs);
    return prefs;
  }

  /**
   * Update a user's preferences
   * 
   * @param userId - ID of the user to update preferences for
   * @param preferences - Updated preferences data
   * @returns Result object with success status and updated preferences or error
   */
  async updateUserPreferences(
    userId: string,
    preferences: PreferencesUpdatePayload
  ): Promise<{ success: boolean; preferences?: UserPreferences; error?: string }> {
    const result = await this.userDataProvider.updateUserPreferences(userId, preferences);
    if (result.success && result.preferences) {
      this.emitEvent({
        type: 'user_preferences_updated',
        timestamp: Date.now(),
        userId,
        preferences: result.preferences,
        updatedFields: Object.keys(preferences)
      });
      DefaultUserService.preferencesCache.set(userId, result.preferences);
      setInBrowser(`um_pref_${userId}`, result.preferences);
    }
    if (!result.success) {
      DefaultUserService.preferencesCache.delete(userId);
      removeFromBrowser(`um_pref_${userId}`);
    }
    return result;
  }

  /**
   * Upload a profile picture for a user
   * 
   * @param userId - ID of the user
   * @param imageData - Image data as a File or Blob
   * @returns Result object with success status and image URL or error
   */
  async uploadProfilePicture(
    userId: string,
    imageData: Blob
  ): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    const result = await this.userDataProvider.uploadProfilePicture(userId, imageData);
    if (result.success && result.imageUrl) {
      this.emitEvent({
        type: 'profile_picture_uploaded',
        timestamp: Date.now(),
        userId,
        imageUrl: result.imageUrl
      });
    }
    return result;
  }

  /**
   * Delete a user's profile picture
   * 
   * @param userId - ID of the user
   * @returns Result object with success status or error
   */
  async deleteProfilePicture(userId: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.userDataProvider.deleteProfilePicture(userId);
    if (result.success) {
      this.emitEvent({
        type: 'profile_picture_deleted',
        timestamp: Date.now(),
        userId
      });
    }
    return result;
  }

  async uploadCompanyLogo(
    _userId: string,
    _companyId: string,
    _fileBuffer: ArrayBuffer,
    _options?: FileUploadOptions
  ): Promise<FileUploadResult> {
    throw new Error('Method not implemented.');
  }

  async deleteCompanyLogo(
    _userId: string,
    _companyId: string
  ): Promise<FileDeleteResult> {
    throw new Error('Method not implemented.');
  }

  /**
   * Update a user's profile visibility settings
   * 
   * @param userId - ID of the user
   * @param visibility - Profile visibility settings
   * @returns Result object with success status and updated visibility settings or error
   */
  async updateProfileVisibility(
    userId: string,
    visibility: ProfileVisibility
  ): Promise<{ success: boolean; visibility?: ProfileVisibility; error?: string }> {
    const result = await this.userDataProvider.updateProfileVisibility(userId, visibility);
    if (result.success && result.visibility) {
      this.emitEvent({
        type: 'profile_visibility_updated',
        timestamp: Date.now(),
        userId,
        visibility: result.visibility
      });
    }
    return result;
  }

  /**
   * Search for users based on search parameters
   * 
   * @param params - Search parameters
   * @returns Search results with pagination
   */
  async searchUsers(params: UserSearchParams): Promise<UserSearchResult> {
    return this.userDataProvider.searchUsers(params);
  }

  /**
   * Deactivate a user account
   * 
   * @param userId - ID of the user to deactivate
   * @param reason - Optional reason for deactivation
   * @returns Result object with success status or error
   */
  async deactivateUser(userId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.userDataProvider.deactivateUser(userId, reason);
    if (result.success) {
      this.emitEvent({
        type: 'user_deactivated',
        timestamp: Date.now(),
        userId,
        reason
      });
    }
    return result;
  }

  /**
   * Reactivate a previously deactivated user account
   * 
   * @param userId - ID of the user to reactivate
   * @returns Result object with success status or error
   */
  async reactivateUser(userId: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.userDataProvider.reactivateUser(userId);
    if (result.success) {
      this.emitEvent({
        type: 'user_reactivated',
        timestamp: Date.now(),
        userId
      });
    }
    return result;
  }

  /**
   * Convert a user's account type (e.g., from private to corporate)
   * 
   * @param userId - ID of the user
   * @param newType - New account type
   * @param additionalData - Additional data required for the new account type
   * @returns Result object with success status and updated profile or error
   */
  async convertUserType(
    userId: string,
    newType: string,
    additionalData?: Record<string, any>
  ): Promise<UserProfileResult> {
    const result = await this.userDataProvider.convertUserType(userId, newType, additionalData);
    if (result.success && result.profile) {
      const previousProfile = await this.getUserProfile(userId);
      const previousType = previousProfile?.userType || 'unknown';

      this.emitEvent({
        type: 'user_type_converted',
        timestamp: Date.now(),
        userId,
        previousType,
        newType
      });
    }
    return result;
  }

  /**
   * Subscribe to user profile changes
   * 
   * @param callback - Function to call when a user profile changes
   * @returns Unsubscribe function
   */
  onUserProfileChanged(callback: (profile: UserProfile) => void): () => void {
    return this.userDataProvider.onUserProfileChanged(profile => {
      this.emitEvent({
        type: 'user_profile_updated',
        timestamp: Date.now(),
        userId: profile.id,
        profile,
        updatedFields: []
      });
      callback(profile);
    });
  }
}
