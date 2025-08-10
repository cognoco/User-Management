import { IUserDataProvider } from '@/core/user/IUserDataProvider';
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

export class MockUserAdapter implements IUserDataProvider {
  private users: Map<string, UserProfile> = new Map();
  private preferences: Map<string, UserPreferences> = new Map();

  constructor() {
    // Set up default mock data
    const defaultUser: UserProfile = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      fullName: 'Test User',
      isActive: true,
      isVerified: true,
      userType: 'private',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.set('user-123', defaultUser);

    const defaultPrefs: UserPreferences = {
      theme: 'light',
      language: 'en',
      timezone: 'UTC',
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      marketingEmails: false,
    };
    this.preferences.set('user-123', defaultPrefs);
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    return this.users.get(userId) || null;
  }

  async updateUserProfile(userId: string, profileData: ProfileUpdatePayload): Promise<UserProfileResult> {
    const existing = this.users.get(userId);
    if (!existing) {
      return { success: false, error: 'User not found' };
    }

    const updated: UserProfile = {
      ...existing,
      ...profileData,
      updatedAt: new Date().toISOString(),
    };
    this.users.set(userId, updated);

    return { success: true, user: updated };
  }

  async getUserPreferences(userId: string): Promise<UserPreferences> {
    return this.preferences.get(userId) || {
      theme: 'light',
      language: 'en',
      timezone: 'UTC',
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      marketingEmails: false,
    };
  }

  async updateUserPreferences(userId: string, preferences: PreferencesUpdatePayload): Promise<{ success: boolean; preferences?: UserPreferences; error?: string }> {
    const current = await this.getUserPreferences(userId);
    const updated = { ...current, ...preferences };
    this.preferences.set(userId, updated);
    return { success: true, preferences: updated };
  }

  async uploadProfilePicture(userId: string, imageData: Blob): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    return { success: true, imageUrl: `https://example.com/avatar/${userId}.jpg` };
  }

  async deleteProfilePicture(userId: string): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  async updateProfileVisibility(userId: string, visibility: ProfileVisibility): Promise<{ success: boolean; visibility?: ProfileVisibility; error?: string }> {
    return { success: true, visibility };
  }

  async searchUsers(params: UserSearchParams): Promise<UserSearchResult> {
    const users = Array.from(this.users.values());
    const total = users.length;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const start = (page - 1) * limit;
    const items = users.slice(start, start + limit);

    return {
      users: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async deactivateUser(userId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    user.isActive = false;
    this.users.set(userId, user);
    return { success: true };
  }

  async reactivateUser(userId: string): Promise<{ success: boolean; error?: string }> {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    user.isActive = true;
    this.users.set(userId, user);
    return { success: true };
  }

  async convertUserType(userId: string, newType: string, additionalData?: Record<string, any>): Promise<UserProfileResult> {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    user.userType = newType;
    this.users.set(userId, user);
    return { success: true, user };
  }

  onUserProfileChanged(callback: (profile: UserProfile) => void): () => void {
    // Mock implementation - return no-op unsubscribe function
    return () => {};
  }

  // Helper methods for testing
  setMockUser(user: UserProfile) {
    this.users.set(user.id, user);
  }

  clearMockData() {
    this.users.clear();
    this.preferences.clear();
  }
}