import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { checkRolePermission } from '@/lib/rbac/roleService';
import { routeAuthMiddleware } from '@/middleware/createMiddlewareChain';

const mockTeamService = {
  getUserTeams: vi.fn(),
  getTeamMembers: vi.fn(),
  getTeamLicenseInfo: vi.fn(),
};

vi.mock('@/middleware/createMiddlewareChain', async () => {
  const actual = await vi.importActual<any>('@/middleware/createMiddlewareChain');
  return {
    ...actual,
    routeAuthMiddleware: vi.fn(() => (handler: any) =>
      (req: any, ctx?: any, data?: any) =>
        handler(req, {
          userId: '1',
          role: 'ADMIN',
          user: {
            id: '1',
            email: 'admin@example.com',
            app_metadata: { role: 'ADMIN', teamId: '1' },
            user_metadata: { role: 'ADMIN', teamId: '1' }
          }
        }, data)),
    rateLimitMiddleware: vi.fn(() => (handler: any) =>
      (req: any, ctx?: any, data?: any) => handler(req, ctx, data)),
    errorHandlingMiddleware: vi.fn(() => (handler: any) =>
      (req: any, ctx?: any, data?: any) => handler(req, ctx, data)),
  };
});

vi.mock('@/services/team/factory', () => ({
  getApiTeamService: vi.fn(() => mockTeamService),
}));

vi.mock('@/lib/rbac/roleService', () => ({
  checkRolePermission: vi.fn(),
}));

describe('Admin Dashboard API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    // Override middleware to pass auth context without user/userId
    vi.mocked(routeAuthMiddleware).mockReturnValueOnce((handler: any) =>
      (req: any, _ctx?: any, data?: any) =>
        handler(req, { userId: null, role: null, user: null }, data)
    );

    // Need to re-import to pick up the new mock
    vi.resetModules();
    const { GET: freshGET } = await import('../route');
    const response = await freshGET({} as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  it('returns 403 when user lacks admin permission', async () => {
    vi.mocked(routeAuthMiddleware).mockReturnValueOnce((handler: any) =>
      (req: any, _ctx?: any, data?: any) =>
        handler(req, {
          userId: '1',
          role: 'USER',
          user: {
            id: '1',
            email: 'user@example.com',
            app_metadata: { role: 'USER', teamId: '1' },
            user_metadata: { role: 'USER', teamId: '1' }
          }
        }, data)
    );
    vi.mocked(checkRolePermission).mockResolvedValueOnce(false);

    const response = await GET({} as any);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data).toEqual({ error: 'Forbidden' });
  });

  it('returns dashboard data for authorized admin', async () => {
    vi.mocked(checkRolePermission).mockResolvedValueOnce(true);

    mockTeamService.getUserTeams.mockResolvedValueOnce([
      { id: 'team-1', name: 'Test Team' },
    ]);

    mockTeamService.getTeamMembers.mockResolvedValueOnce([
      { id: 'm1', isActive: true },
      { id: 'm2', isActive: true },
      { id: 'm3', isActive: true },
      { id: 'm4', isActive: true },
      { id: 'm5', isActive: true },
      { id: 'm6', isActive: false },
      { id: 'm7', isActive: false },
    ]);

    mockTeamService.getTeamLicenseInfo.mockResolvedValueOnce({
      totalSeats: 10,
      usedSeats: 7,
    });

    const response = await GET({} as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      team: {
        activeMembers: 5,
        pendingMembers: 2,
        totalMembers: 7,
        seatUsage: {
          used: 7,
          total: 10,
          percentage: 70,
        },
      },
      subscription: {
        plan: 'TEAM',
        status: 'ACTIVE',
        trialEndsAt: null,
        currentPeriodEndsAt: null,
      },
      recentActivity: [],
    });
  });

  it('handles database errors gracefully', async () => {
    vi.mocked(checkRolePermission).mockResolvedValueOnce(true);
    mockTeamService.getUserTeams.mockRejectedValueOnce(new Error('Database error'));

    const response = await GET({} as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to fetch dashboard data' });
  });

  it('handles no teams gracefully', async () => {
    vi.mocked(checkRolePermission).mockResolvedValueOnce(true);
    mockTeamService.getUserTeams.mockResolvedValueOnce([]);

    const response = await GET({} as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      team: {
        activeMembers: 0,
        pendingMembers: 0,
        totalMembers: 0,
        seatUsage: {
          used: 0,
          total: 0,
          percentage: 0,
        },
      },
      subscription: {
        plan: 'TEAM',
        status: 'ACTIVE',
        trialEndsAt: null,
        currentPeriodEndsAt: null,
      },
      recentActivity: [],
    });
  });
});
