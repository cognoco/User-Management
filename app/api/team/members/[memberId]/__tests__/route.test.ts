import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from '../route';
import { configureServices, resetServiceContainer } from '@/lib/config/service-container';
import type { AuthService } from '@/core/auth/interfaces';
import type { TeamService } from '@/core/team/interfaces';
import type { PermissionService } from '@/core/permission/interfaces';
import type { UserService } from '@/core/user/interfaces';
import type { TeamMember } from '@/core/team/models';
import { createAuthenticatedRequest } from '@/tests/utils/request-helpers';
import createMockUserService from '@/tests/mocks/user.service.mock';

// Mock service factories that configureServices doesn't override
vi.mock('@/services/user/factory', () => ({}));
vi.mock('@/services/auth/factory', () => ({}));
vi.mock('@/services/team/factory', () => ({}));
vi.mock('@/services/permission/factory', () => ({}));

// Use valid UUIDs throughout
const CURRENT_USER_ID = '00000000-0000-0000-0000-000000000001';
const TARGET_USER_ID = '00000000-0000-0000-0000-000000000002';
const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000003';
const MEMBER_ID = '10000000-0000-0000-0000-000000000001';
const ADMIN_MEMBER_ID = '10000000-0000-0000-0000-000000000002';
const CURRENT_MEMBER_ID = '10000000-0000-0000-0000-000000000003';
const TEAM_ID = '20000000-0000-0000-0000-000000000001';
const OTHER_TEAM_ID = '20000000-0000-0000-0000-000000000002';

const mockCurrentUser = { id: CURRENT_USER_ID, email: 'admin@example.com' };

const authService: Partial<AuthService> = {
  getCurrentUser: vi.fn().mockResolvedValue(mockCurrentUser),
};

const userService = createMockUserService();

const permissionService: Partial<PermissionService> = {
  hasPermission: vi.fn().mockResolvedValue(true),
  hasRole: vi.fn().mockResolvedValue(false),
};

const teamService: Partial<TeamService> = {
  getTeamMemberById: vi.fn(),
  getTeamMembers: vi.fn(),
  removeTeamMember: vi.fn(),
};

function makeMember(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id: MEMBER_ID,
    teamId: TEAM_ID,
    userId: TARGET_USER_ID,
    role: 'MEMBER',
    isActive: true,
    joinedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const defaultMembers: TeamMember[] = [
  makeMember({ id: CURRENT_MEMBER_ID, userId: CURRENT_USER_ID, role: 'ADMIN' }),
  makeMember({ id: MEMBER_ID, userId: TARGET_USER_ID, role: 'MEMBER' }),
];

beforeEach(() => {
  vi.clearAllMocks();
  resetServiceContainer();
  configureServices({
    authService: authService as AuthService,
    userService: userService as UserService,
    teamService: teamService as TeamService,
    permissionService: permissionService as PermissionService,
    featureFlags: {
      sso: false,
      twoFactor: false,
      subscription: false,
      notifications: false,
      webhooks: false,
      gdpr: false,
      apiKeys: false,
    },
  });
});

function makeRequest(memberId: string = MEMBER_ID) {
  const req = createAuthenticatedRequest('DELETE', `http://localhost/api/team/members/${memberId}`);
  return DELETE(req, { params: { memberId } });
}

describe('DELETE /api/team/members/[memberId]', () => {
  it('should successfully remove a team member', async () => {
    const target = makeMember();
    vi.mocked(teamService.getTeamMemberById!).mockResolvedValue(target);
    vi.mocked(teamService.getTeamMembers!).mockResolvedValue(defaultMembers);
    vi.mocked(teamService.removeTeamMember!).mockResolvedValue({ success: true });

    const response = await makeRequest();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.message).toBe('Team member removed successfully');
    expect(teamService.removeTeamMember).toHaveBeenCalledWith(TEAM_ID, TARGET_USER_ID);
  });

  it('should return 401 when user is not authenticated', async () => {
    const req = createAuthenticatedRequest('DELETE', `http://localhost/api/team/members/${MEMBER_ID}`, undefined, null);
    const response = await DELETE(req, { params: { memberId: MEMBER_ID } });
    expect(response.status).toBe(401);
  });

  it('should return 400 when trying to remove self', async () => {
    const selfMember = makeMember({ userId: CURRENT_USER_ID });
    vi.mocked(teamService.getTeamMemberById!).mockResolvedValue(selfMember);
    vi.mocked(teamService.getTeamMembers!).mockResolvedValue(defaultMembers);

    const response = await makeRequest();
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Cannot remove yourself from the team');
  });

  it('should return 400 when trying to remove last admin', async () => {
    const adminMember = makeMember({ id: ADMIN_MEMBER_ID, userId: ADMIN_USER_ID, role: 'ADMIN' });
    const membersWithOneAdmin: TeamMember[] = [
      makeMember({ id: ADMIN_MEMBER_ID, userId: ADMIN_USER_ID, role: 'ADMIN' }),
      makeMember({ id: CURRENT_MEMBER_ID, userId: CURRENT_USER_ID, role: 'MEMBER' }),
    ];
    vi.mocked(teamService.getTeamMemberById!).mockResolvedValue(adminMember);
    vi.mocked(teamService.getTeamMembers!).mockResolvedValue(membersWithOneAdmin);

    const response = await makeRequest(ADMIN_MEMBER_ID);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Cannot remove the last admin from the team');
  });

  it('should return 404 when team member is not found', async () => {
    vi.mocked(teamService.getTeamMemberById!).mockResolvedValue(null);

    const response = await makeRequest();
    expect(response.status).toBe(404);
  });

  it('should throw when memberId is not a valid UUID', async () => {
    // Zod uuid validation throws before createApiHandler's try/catch
    await expect(makeRequest('invalid-uuid')).rejects.toThrow();
  });

  it('should return 403 when removing member from another team', async () => {
    const otherTeamMember = makeMember({ teamId: OTHER_TEAM_ID });
    const otherTeamMembers: TeamMember[] = [
      makeMember({ id: ADMIN_MEMBER_ID, userId: ADMIN_USER_ID, role: 'ADMIN', teamId: OTHER_TEAM_ID }),
    ];
    vi.mocked(teamService.getTeamMemberById!).mockResolvedValue(otherTeamMember);
    vi.mocked(teamService.getTeamMembers!).mockResolvedValue(otherTeamMembers);

    const response = await makeRequest();
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Cannot modify members of another team');
  });

  it('should return 500 when service operation fails', async () => {
    const target = makeMember();
    vi.mocked(teamService.getTeamMemberById!).mockResolvedValue(target);
    vi.mocked(teamService.getTeamMembers!).mockResolvedValue(defaultMembers);
    vi.mocked(teamService.removeTeamMember!).mockResolvedValue({ success: false, error: 'Database error' });

    const response = await makeRequest();
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Database error');
  });
});
