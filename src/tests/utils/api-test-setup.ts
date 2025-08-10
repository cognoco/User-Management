// src/tests/utils/api-test-setup.ts
import { vi } from 'vitest';

/**
 * Sets up mock services for API route testing
 * This approach mocks the service factories directly to avoid adapter registry issues
 */
export function setupApiTestServices() {
  // Mock auth service factory
  vi.mock('@/services/auth/factory', () => {
    const mockAuthService = {
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      updatePasswordWithToken: vi.fn(),
      verifyPasswordResetToken: vi.fn(),
      sendVerificationEmail: vi.fn(),
      sendMagicLink: vi.fn(),
      verifyEmail: vi.fn(),
      verifyMagicLink: vi.fn(),
      deleteAccount: vi.fn(),
      setupMFA: vi.fn(),
      verifyMFA: vi.fn(),
      disableMFA: vi.fn(),
      refreshToken: vi.fn(),
      onAuthStateChanged: vi.fn(),
      invalidateSessions: vi.fn(),
    };

    return {
      getApiAuthService: vi.fn(() => mockAuthService),
      createApiAuthService: vi.fn(() => mockAuthService),
      mockAuthService, // Export for test access
    };
  });

  // Mock user service factory
  vi.mock('@/services/user/factory', () => {
    const mockUserService = {
      getUserProfile: vi.fn(),
      updateUserProfile: vi.fn(),
      getUserPreferences: vi.fn(),
      updateUserPreferences: vi.fn(),
      uploadProfilePicture: vi.fn(),
      deleteProfilePicture: vi.fn(),
      searchUsers: vi.fn(),
      deactivateUser: vi.fn(),
      reactivateUser: vi.fn(),
    };

    return {
      getApiUserService: vi.fn(() => mockUserService),
      createApiUserService: vi.fn(() => mockUserService),
      mockUserService, // Export for test access
    };
  });

  // Mock team service factory
  vi.mock('@/services/team/factory', () => {
    const mockTeamService = {
      createTeam: vi.fn(),
      getTeam: vi.fn(),
      updateTeam: vi.fn(),
      deleteTeam: vi.fn(),
      getUserTeams: vi.fn(),
      getTeamMembers: vi.fn(),
      addTeamMember: vi.fn(),
      removeTeamMember: vi.fn(),
      updateMemberRole: vi.fn(),
      inviteToTeam: vi.fn(),
      acceptInvitation: vi.fn(),
      rejectInvitation: vi.fn(),
    };

    return {
      getApiTeamService: vi.fn(() => mockTeamService),
      createApiTeamService: vi.fn(() => mockTeamService),
      mockTeamService, // Export for test access
    };
  });

  // Mock permission service factory
  vi.mock('@/services/permission/factory', () => {
    const mockPermissionService = {
      hasPermission: vi.fn(),
      hasRole: vi.fn(),
      getUserPermissions: vi.fn(),
      getUserRoles: vi.fn(),
      assignRoleToUser: vi.fn(),
      removeRoleFromUser: vi.fn(),
      getRoles: vi.fn(),
      createRole: vi.fn(),
      updateRole: vi.fn(),
      deleteRole: vi.fn(),
    };

    return {
      getApiPermissionService: vi.fn(() => mockPermissionService),
      createApiPermissionService: vi.fn(() => mockPermissionService),
      mockPermissionService, // Export for test access
    };
  });

  // Mock notification service factory
  vi.mock('@/services/notification/factory', () => {
    const mockNotificationService = {
      createNotification: vi.fn(),
      getUserNotifications: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      deleteNotification: vi.fn(),
      getUserPreferences: vi.fn(),
      updateUserPreferences: vi.fn(),
    };

    return {
      getApiNotificationService: vi.fn(() => mockNotificationService),
      createApiNotificationService: vi.fn(() => mockNotificationService),
      mockNotificationService, // Export for test access
    };
  });
}