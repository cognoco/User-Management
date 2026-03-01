// src/tests/utils/test-service-setup.ts
import { vi } from 'vitest';
import { UserManagementConfiguration } from '../../core/config';
import { MockAuthService } from '../../services/auth/__tests__/mocks/mock-auth-service';
import { MockUserService } from '../../services/user/__tests__/mocks/mock-user-service';
import { MockTeamService } from '../../services/team/__tests__/mocks/mock-team-service';
import { MockPermissionService } from '../../services/permission/__tests__/mocks/mock-permission-service';
import { UserType } from '../../types/user-type';
import { TeamVisibility } from '../../core/team/models';
import { PermissionValues } from '../../core/permission/models';

/**
 * Sets up mock services for UI component testing
 * @param customConfig Optional custom configuration overrides
 */
export function setupTestServices(customConfig = {}) {
  // Reset the configuration
  UserManagementConfiguration.reset();
  
  // Create mock services
  const mockAuthService = new MockAuthService();
  const mockUserService = new MockUserService();
  const mockTeamService = new MockTeamService();
  const mockPermissionService = new MockPermissionService();
  
  // Configure with mock services
  UserManagementConfiguration.configureServiceProviders({
    authService: mockAuthService,
    userService: mockUserService,
    teamService: mockTeamService,
    permissionService: mockPermissionService,
    ...customConfig
  });
  
  // Setup default mock data
  setupDefaultMockData(mockAuthService, mockUserService, mockTeamService, mockPermissionService);
  
  // Return the mock services for test-specific customization
  return {
    mockAuthService,
    mockUserService,
    mockTeamService,
    mockPermissionService
  };
}

/**
 * Sets up default mock data for testing
 */
function setupDefaultMockData(
  authService: MockAuthService,
  userService: MockUserService,
  teamService: MockTeamService,
  permissionService: MockPermissionService
) {
  // Setup a default authenticated user
  const defaultUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: true
  };
  
  authService.setMockUser(defaultUser);
  
  // Setup default user profile
  userService.setMockProfile('user-123', {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    fullName: 'Test User',
    isActive: true,
    isVerified: true,
    userType: UserType.PRIVATE
  });
  
  // Setup default team
  const defaultTeam = {
    id: 'team-123',
    name: 'Test Team',
    description: 'A team for testing',
    ownerId: 'user-123',
    isActive: true,
    visibility: TeamVisibility.PRIVATE,
    memberLimit: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  teamService.setMockTeam(defaultTeam);
  
  // Setup default roles and permissions
  const adminRole = {
    id: 'role-admin',
    name: 'admin',
    description: 'Administrator role',
    createdAt: new Date(),
    updatedAt: new Date(),
    permissions: [
      PermissionValues.EDIT_USER_PROFILES,
      PermissionValues.DELETE_USER_ACCOUNTS,
      PermissionValues.VIEW_TEAM_MEMBERS,
      PermissionValues.MANAGE_TEAMS
    ]
  };
  
  permissionService.setMockRole(adminRole);
  
  // Assign admin role to default user
  permissionService.setMockUserRoles('user-123', [{
    id: 'user-role-123',
    userId: 'user-123',
    roleId: 'role-admin',
    assignedBy: 'system',
    createdAt: new Date()
  }]);
}