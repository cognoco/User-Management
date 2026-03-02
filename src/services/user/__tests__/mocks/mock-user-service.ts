// src/services/user/__tests__/mocks/mock-user-service.ts
import { vi } from 'vitest';
import { UserService } from '../../../../core/user/interfaces';
import { 
  UserProfile, 
  ProfileUpdatePayload, 
  UserPreferences,
  PreferencesUpdatePayload,
  UserProfileResult,
  UserSearchParams,
  UserSearchResult,
  ProfileVisibility,
  VisibilityLevel
} from '../../../../core/user/models';
import { UserType } from '../../../../types/user-type';
import type {
  FileUploadOptions,
  FileUploadResult,
  FileDeleteResult
} from '../../../../core/storage/interfaces';

/**
 * Mock implementation of the UserService interface for testing
 */
export class MockUserService implements UserService {
  private profileChangeListeners: ((profile: UserProfile) => void)[] = [];
  private mockProfiles: Record<string, UserProfile> = {};
  private mockPreferences: Record<string, UserPreferences> = {};
  
  // Default mock user profile
  private defaultProfile: UserProfile = {
    id: 'mock-user-id',
    email: 'user@example.com',
    firstName: 'Test',
    lastName: 'User',
    fullName: 'Test User',
    profilePictureUrl: 'https://example.com/avatar.png',
    isActive: true,
    isVerified: true,
    userType: UserType.PRIVATE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    visibility: {
      email: VisibilityLevel.PRIVATE,
      fullName: VisibilityLevel.PUBLIC,
      profilePicture: VisibilityLevel.PUBLIC,
      companyInfo: VisibilityLevel.TEAM_ONLY,
      lastLogin: VisibilityLevel.PRIVATE
    }
  };
  
  // Default mock user preferences
  private defaultPreferences: UserPreferences = {
    language: 'en',
    theme: 'light',
    emailNotifications: {
      marketing: false,
      securityAlerts: true,
      accountUpdates: true,
      teamInvitations: true
    },
    pushNotifications: {
      enabled: true,
      events: ['security_alerts', 'team_invitations']
    }
  };

  constructor() {
    // Initialize with a default user
    this.mockProfiles['mock-user-id'] = { ...this.defaultProfile };
    this.mockPreferences['mock-user-id'] = { ...this.defaultPreferences };
  }

  // Mock implementations with Vitest spies
  getUserProfile = vi.fn().mockImplementation(async (userId: string): Promise<UserProfile | null> => {
    return this.mockProfiles[userId] || null;
  });

  updateUserProfile = vi.fn().mockImplementation(async (userId: string, profileData: ProfileUpdatePayload): Promise<UserProfileResult> => {
    if (!this.mockProfiles[userId]) {
      return { success: false, error: 'User not found' };
    }

    this.mockProfiles[userId] = {
      ...this.mockProfiles[userId],
      ...profileData,
      updatedAt: new Date().toISOString()
    } as UserProfile;

    // If firstName or lastName changed, update fullName
    if (profileData.firstName || profileData.lastName) {
      const firstName = profileData.firstName || this.mockProfiles[userId].firstName || '';
      const lastName = profileData.lastName || this.mockProfiles[userId].lastName || '';
      this.mockProfiles[userId].fullName = `${firstName} ${lastName}`.trim();
    }

    this.notifyProfileChange(this.mockProfiles[userId]);
    
    return { 
      success: true, 
      profile: this.mockProfiles[userId] 
    };
  });

  getUserPreferences = vi.fn().mockImplementation(async (userId: string): Promise<UserPreferences> => {
    return this.mockPreferences[userId] || { ...this.defaultPreferences };
  });

  updateUserPreferences = vi.fn().mockImplementation(async (userId: string, preferences: PreferencesUpdatePayload): Promise<{ success: boolean; preferences?: UserPreferences; error?: string }> => {
    if (!this.mockProfiles[userId]) {
      return { success: false, error: 'User not found' };
    }

    this.mockPreferences[userId] = {
      ...this.mockPreferences[userId] || this.defaultPreferences,
      ...preferences,
      emailNotifications: {
        ...(this.mockPreferences[userId]?.emailNotifications || this.defaultPreferences.emailNotifications),
        ...(preferences.emailNotifications || {})
      },
      pushNotifications: {
        ...(this.mockPreferences[userId]?.pushNotifications || this.defaultPreferences.pushNotifications),
        ...(preferences.pushNotifications || {})
      }
    };
    
    return { 
      success: true, 
      preferences: this.mockPreferences[userId] 
    };
  });

  uploadProfilePicture = vi.fn().mockImplementation(async (userId: string, _imageData: Blob): Promise<{ success: boolean; imageUrl?: string; error?: string }> => {
    if (!this.mockProfiles[userId]) {
      return { success: false, error: 'User not found' };
    }

    const imageUrl = 'https://example.com/avatar-new.png';
    this.mockProfiles[userId].profilePictureUrl = imageUrl;
    this.notifyProfileChange(this.mockProfiles[userId]);
    
    return { success: true, imageUrl };
  });

  deleteProfilePicture = vi.fn().mockImplementation(async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (!this.mockProfiles[userId]) {
      return { success: false, error: 'User not found' };
    }

    this.mockProfiles[userId].profilePictureUrl = undefined;
    this.notifyProfileChange(this.mockProfiles[userId]);

    return { success: true };
  });

  uploadCompanyLogo = vi.fn().mockImplementation(async (
    _userId: string,
    _companyId: string,
    _fileBuffer: ArrayBuffer,
    _options?: FileUploadOptions
  ): Promise<FileUploadResult> => {
    return { success: false, error: 'Not implemented' };
  });

  deleteCompanyLogo = vi.fn().mockImplementation(async (
    _userId: string,
    _companyId: string
  ): Promise<FileDeleteResult> => {
    return { success: false, error: 'Not implemented' };
  });

  updateProfileVisibility = vi.fn().mockImplementation(async (userId: string, visibility: ProfileVisibility): Promise<{ success: boolean; visibility?: ProfileVisibility; error?: string }> => {
    if (!this.mockProfiles[userId]) {
      return { success: false, error: 'User not found' };
    }

    this.mockProfiles[userId].visibility = visibility;
    this.notifyProfileChange(this.mockProfiles[userId]);
    
    return { success: true, visibility };
  });

  searchUsers = vi.fn().mockImplementation(async (params: UserSearchParams): Promise<UserSearchResult> => {
    const allUsers = Object.values(this.mockProfiles);
    let filteredUsers = [...allUsers];
    
    // Apply filters
    if (params.query) {
      const query = params.query.toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        user.email.toLowerCase().includes(query) || 
        (user.fullName && user.fullName.toLowerCase().includes(query)) ||
        (user.username && user.username.toLowerCase().includes(query))
      );
    }
    
    if (params.userType !== undefined) {
      filteredUsers = filteredUsers.filter(user => user.userType === params.userType);
    }
    
    if (params.isActive !== undefined) {
      filteredUsers = filteredUsers.filter(user => user.isActive === params.isActive);
    }
    
    if (params.isVerified !== undefined) {
      filteredUsers = filteredUsers.filter(user => user.isVerified === params.isVerified);
    }
    
    if (params.company) {
      filteredUsers = filteredUsers.filter(user => 
        user.company && user.company.name.toLowerCase().includes(params.company!.toLowerCase())
      );
    }
    
    // Apply sorting
    if (params.sortBy) {
      filteredUsers.sort((a, b) => {
        let valueA, valueB;
        
        switch (params.sortBy) {
          case 'name':
            valueA = a.fullName || '';
            valueB = b.fullName || '';
            break;
          case 'email':
            valueA = a.email;
            valueB = b.email;
            break;
          case 'createdAt':
            valueA = a.createdAt || '';
            valueB = b.createdAt || '';
            break;
          case 'lastLogin':
            valueA = a.lastLogin || '';
            valueB = b.lastLogin || '';
            break;
          default:
            return 0;
        }
        
        if (params.sortDirection === 'desc') {
          return valueB.localeCompare(valueA);
        }
        return valueA.localeCompare(valueB);
      });
    }
    
    // Apply pagination
    const page = params.page || 1;
    const limit = params.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedUsers = filteredUsers.slice(start, end);
    
    return {
      users: paginatedUsers,
      total: filteredUsers.length,
      page,
      limit,
      totalPages: Math.ceil(filteredUsers.length / limit)
    };
  });

  deactivateUser = vi.fn().mockImplementation(async (userId: string, _reason?: string): Promise<{ success: boolean; error?: string }> => {
    if (!this.mockProfiles[userId]) {
      return { success: false, error: 'User not found' };
    }

    this.mockProfiles[userId].isActive = false;
    this.notifyProfileChange(this.mockProfiles[userId]);
    
    return { success: true };
  });

  reactivateUser = vi.fn().mockImplementation(async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (!this.mockProfiles[userId]) {
      return { success: false, error: 'User not found' };
    }

    this.mockProfiles[userId].isActive = true;
    this.notifyProfileChange(this.mockProfiles[userId]);
    
    return { success: true };
  });

  convertUserType = vi.fn().mockImplementation(async (userId: string, newType: string, additionalData?: Record<string, any>): Promise<UserProfileResult> => {
    if (!this.mockProfiles[userId]) {
      return { success: false, error: 'User not found' };
    }

    this.mockProfiles[userId].userType = newType as UserType;
    
    // If converting to corporate, add company info
    if (newType === UserType.CORPORATE && additionalData?.company) {
      this.mockProfiles[userId].company = additionalData.company;
    }
    
    this.notifyProfileChange(this.mockProfiles[userId]);
    
    return { 
      success: true, 
      profile: this.mockProfiles[userId] 
    };
  });

  onUserProfileChanged = vi.fn().mockImplementation((callback: (profile: UserProfile) => void): (() => void) => {
    this.profileChangeListeners.push(callback);
    return () => {
      const index = this.profileChangeListeners.indexOf(callback);
      if (index !== -1) {
        this.profileChangeListeners.splice(index, 1);
      }
    };
  });

  // Helper methods for testing
  private notifyProfileChange(profile: UserProfile): void {
    this.profileChangeListeners.forEach(listener => listener(profile));
  }

  // Methods to control mock behavior in tests
  setMockProfile(userId: string, profile: Partial<UserProfile>): void {
    this.mockProfiles[userId] = {
      ...this.defaultProfile,
      ...profile,
      id: userId
    };
    this.notifyProfileChange(this.mockProfiles[userId]);
  }

  setMockPreferences(userId: string, preferences: Partial<UserPreferences>): void {
    this.mockPreferences[userId] = {
      ...this.defaultPreferences,
      ...preferences
    };
  }

  getMockProfile(userId: string): UserProfile | null {
    return this.mockProfiles[userId] || null;
  }

  getMockPreferences(userId: string): UserPreferences | null {
    return this.mockPreferences[userId] || null;
  }

  clearMocks(): void {
    this.mockProfiles = {};
    this.mockPreferences = {};
    this.profileChangeListeners = [];
  }
}
