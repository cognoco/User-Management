import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { ERROR_CODES } from '@/lib/api/common';

// Mock services
const mockTeamService = {
  getUserTeams: vi.fn(),
  getTeamMembers: vi.fn(),
  addTeamMember: vi.fn(),
  getTeamLicenseInfo: vi.fn(),
};

const mockUser = { id: 'user1', name: 'Test User', email: 'test@example.com' };

const mockAuthService = {
  getCurrentUser: vi.fn().mockResolvedValue(mockUser),
  getSession: vi.fn().mockResolvedValue({ user: mockUser }),
  validateSession: vi.fn().mockResolvedValue({ user: mockUser }),
};

const mockPermissionService = {
  hasPermission: vi.fn().mockResolvedValue(true),
  getUserRoles: vi.fn().mockResolvedValue([]),
  getUserPermissions: vi.fn().mockResolvedValue(['view:team_members', 'invite:team_member']),
};

vi.mock('@/lib/config/service-container', () => ({
  getServiceContainer: vi.fn(() => ({
    auth: mockAuthService,
    permission: mockPermissionService,
    team: mockTeamService,
  })),
}));

vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: vi.fn((config: any) => {
    return async (request: any) => {
      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      if (!token && config.requireAuth) {
        const { ApiError, ERROR_CODES } = await import('@/lib/api/common');
        throw new ApiError(ERROR_CODES.UNAUTHORIZED, 'Authentication required', 401);
      }
      if (!token) {
        return { isAuthenticated: false };
      }
      const user = await mockAuthService.getCurrentUser();
      if (!user && config.requireAuth) {
        const { ApiError, ERROR_CODES } = await import('@/lib/api/common');
        throw new ApiError(ERROR_CODES.UNAUTHORIZED, 'Invalid token', 401);
      }
      return {
        isAuthenticated: true,
        userId: user?.id,
        user,
        permissions: ['VIEW_TEAM_MEMBERS', 'INVITE_TEAM_MEMBER'],
        token,
      };
    };
  }),
}));

vi.mock('@/middleware/auth-adapter', () => ({}));
vi.mock('@/services/auth/factory', () => ({}));
vi.mock('@/services/permission/factory', () => ({
  getApiPermissionService: () => mockPermissionService,
}));

/** Helper to create a request with a Bearer token */
function createRequest(url: string, options?: any) {
  const headers = new Headers(options?.headers);
  headers.set('Authorization', 'Bearer test-token');
  const req = new NextRequest(url, { ...options, headers });
  return req;
}

describe('Team Members API', () => {
  const mockTeams = [
    { id: 'team1', name: 'Test Team', ownerId: 'user1' },
  ];

  const mockMembers = [
    {
      id: 'member1',
      teamId: 'team1',
      userId: 'user1',
      role: 'ADMIN',
      joinedAt: new Date('2024-01-01T00:00:00Z'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
    mockTeamService.getUserTeams.mockResolvedValue(mockTeams);
    mockTeamService.getTeamMembers.mockResolvedValue(mockMembers);
    mockTeamService.addTeamMember.mockResolvedValue({
      success: true,
      member: mockMembers[0],
    });
  });

  it('returns 401 when no token is provided', async () => {
    // No Bearer token → 401
    const request = new NextRequest('http://localhost:3000/api/team/members');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error.code).toBe(ERROR_CODES.UNAUTHORIZED);
  });

  it('returns 401 when getCurrentUser returns null', async () => {
    mockAuthService.getCurrentUser.mockResolvedValueOnce(null);

    const request = createRequest('http://localhost:3000/api/team/members');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error.code).toBe(ERROR_CODES.UNAUTHORIZED);
  });

  it('returns team members with pagination', async () => {
    const request = createRequest('http://localhost:3000/api/team/members');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.users).toEqual(
      mockMembers.map(m => ({ ...m, joinedAt: m.joinedAt.toISOString() }))
    );
    expect(data.data.pagination).toEqual({
      page: 1,
      limit: 10,
      totalCount: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it('handles search parameter', async () => {
    const request = createRequest(
      'http://localhost:3000/api/team/members?search=user1'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockTeamService.getTeamMembers).toHaveBeenCalledWith('team1');
  });

  it('returns 404 when user has no teams', async () => {
    mockTeamService.getUserTeams.mockResolvedValueOnce([]);

    const request = createRequest('http://localhost:3000/api/team/members');
    const response = await GET(request);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error.code).toBe(ERROR_CODES.NOT_FOUND);
  });

  it('handles service errors gracefully', async () => {
    mockTeamService.getUserTeams.mockRejectedValueOnce(
      new Error('Service error')
    );

    const request = createRequest('http://localhost:3000/api/team/members');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
  });

  it('adds a team member via POST', async () => {
    const request = createRequest('http://localhost:3000/api/team/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: 'team1', userId: 'user2', role: 'member' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(mockTeamService.addTeamMember).toHaveBeenCalledWith('team1', 'user2', 'member');
  });

  it('returns error when addTeamMember fails', async () => {
    mockTeamService.addTeamMember.mockResolvedValueOnce({
      success: false,
      error: 'Seat limit reached',
    });

    const request = createRequest('http://localhost:3000/api/team/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: 'team1', userId: 'user2', role: 'member' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe(ERROR_CODES.INVALID_REQUEST);
  });
});
