import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { prisma } from '@/lib/database/prisma';
import { checkRolePermission } from '@/lib/rbac/roleService';
import { routeAuthMiddleware } from '@/middleware/createMiddlewareChain';
import { NextResponse } from 'next/server';

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
  };
});

// Mock dependencies

vi.mock('@/lib/database/prisma', () => ({
  prisma: {
    teamMember: {
      groupBy: vi.fn()
    },
    subscription: {
      findUnique: vi.fn()
    },
    activityLog: {
      findMany: vi.fn()
    }
  }
}));

vi.mock('@/lib/rbac/roleService', () => ({
  checkRolePermission: vi.fn()
}));

describe('Admin Dashboard API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 when user is not authenticated', async () => {
    vi.mocked(routeAuthMiddleware).mockReturnValueOnce((handler: any) =>
      (_req: any, _ctx?: any, data?: any) => {
        // Simulate auth middleware returning error directly without calling handler
        return Promise.resolve(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
      }
    );

    const response = await GET({} as any);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data).toEqual({ error: 'Forbidden' });
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

    // Mock team stats
    vi.mocked(prisma.teamMember.groupBy).mockResolvedValueOnce([
      { status: 'ACTIVE', _count: { _all: 5 } },
      { status: 'PENDING', _count: { _all: 2 } }
    ] as any);

    // Mock subscription data
    vi.mocked(prisma.subscription.findUnique).mockResolvedValueOnce({
      plan: 'PRO',
      status: 'ACTIVE',
      seats: 10,
      trialEndsAt: null,
      currentPeriodEndsAt: new Date('2025-01-01')
    } as any);

    // Mock activity logs
    const mockActivity = {
      id: '1',
      type: 'MEMBER_ADDED',
      description: 'New member added',
      createdAt: new Date('2025-06-02T19:43:30.075Z'),
      user: {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com'
      }
    };
    vi.mocked(prisma.activityLog.findMany).mockResolvedValueOnce([mockActivity] as any);

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
          percentage: 70
        }
      },
      subscription: {
        plan: 'PRO',
        status: 'ACTIVE',
        trialEndsAt: null,
        currentPeriodEndsAt: '2025-01-01T00:00:00.000Z'
      },
      recentActivity: [{
        id: '1',
        type: 'MEMBER_ADDED',
        description: 'New member added',
        createdAt: '2025-06-02T19:43:30.075Z',
        user: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com'
        }
      }]
    });
  });

  it('handles database errors gracefully', async () => {
    vi.mocked(checkRolePermission).mockResolvedValueOnce(true);
    vi.mocked(prisma.teamMember.groupBy).mockRejectedValueOnce(new Error('Database error'));

    const response = await GET({} as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to fetch dashboard data' });
  });

  it('handles missing subscription data', async () => {
    vi.mocked(checkRolePermission).mockResolvedValueOnce(true);
    vi.mocked(prisma.teamMember.groupBy).mockResolvedValueOnce([]);
    vi.mocked(prisma.subscription.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.activityLog.findMany).mockResolvedValueOnce([]);

    const response = await GET({} as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.subscription).toEqual({
      plan: 'NO_PLAN',
      status: 'INACTIVE',
      trialEndsAt: null,
      currentPeriodEndsAt: null
    });
  });
});