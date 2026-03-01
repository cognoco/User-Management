import { vi } from "vitest";
import type { UserService } from "@/core/user/interfaces";
import type {
  UserProfile,
  ProfileUpdatePayload,
  UserProfileResult,
  ProfileVisibility,
  UserSearchParams,
  UserSearchResult,
} from "@/core/user/models";
import { UserType } from "@/types/user-type";
import { VisibilityLevel } from "@/core/user/models";

export function createMockUserService(
  overrides: Partial<UserService> = {},
): UserService {
  const defaultProfile: UserProfile = {
    id: "user-1",
    email: "user@example.com",
    firstName: "Test",
    lastName: "User",
    fullName: "Test User",
    profilePictureUrl: "http://example.com/avatar.png",
    isActive: true,
    isVerified: true,
    userType: UserType.PRIVATE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    visibility: {
      email: VisibilityLevel.PRIVATE,
      fullName: VisibilityLevel.PUBLIC,
      profilePicture: VisibilityLevel.PUBLIC,
      companyInfo: VisibilityLevel.PRIVATE,
      lastLogin: VisibilityLevel.PRIVATE,
    },
  };

  const service: UserService = {
    getUserProfile: vi.fn(async () => defaultProfile),
    updateUserProfile: vi.fn(
      async (
        _id: string,
        data: ProfileUpdatePayload,
      ): Promise<UserProfileResult> => ({
        success: true,
        profile: { ...defaultProfile, ...data } as UserProfile,
      }),
    ),
    getUserPreferences: vi.fn(async () => ({
      notifications: { email: true },
    })) as any,
    updateUserPreferences: vi.fn(async () => ({
      success: true,
      preferences: { notifications: { email: true } },
    })) as any,
    uploadProfilePicture: vi.fn(async () => ({
      success: true,
      imageUrl: "http://example.com/avatar.png",
    })),
    deleteProfilePicture: vi.fn(async () => ({ success: true })),
    uploadCompanyLogo: vi.fn(async () => ({
      success: true,
      url: "http://example.com/logo.png",
      fileId: "logo-1",
      fileName: "logo.png",
      mimeType: "image/png",
      size: 1024,
    })),
    deleteCompanyLogo: vi.fn(async () => ({
      success: true,
    })),
    updateProfileVisibility: vi.fn(
      async (_id: string, visibility: ProfileVisibility) => ({
        success: true,
        visibility,
      }),
    ),
    searchUsers: vi.fn(async (_params: UserSearchParams) => ({
      users: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
    })) as any,
    deactivateUser: vi.fn(async () => ({ success: true })),
    reactivateUser: vi.fn(async () => ({ success: true })),
    convertUserType: vi.fn(async () => ({
      success: true,
      profile: defaultProfile,
    })),
    onUserProfileChanged: vi.fn(() => () => {}),
    ...overrides,
  } as UserService;

  return service;
}

export default createMockUserService;
