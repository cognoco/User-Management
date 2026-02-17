import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import { checkRolePermission } from '@/lib/rbac/roleService';
import { Role } from '@/types/rbac';
import {
  createMiddlewareChain,
  errorHandlingMiddleware,
  routeAuthMiddleware,
  rateLimitMiddleware,
} from '@/middleware/createMiddlewareChain';
import type { AuthContext } from '@/core/config/interfaces';

async function handleGet(_req: NextRequest, auth: AuthContext) {
  try {
    // Authentication middleware attaches the Supabase user when valid
    if (!auth.user || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (auth.user.app_metadata?.role || auth.user.user_metadata?.role || auth.role) as Role;

    // Check if user has admin permission using Supabase metadata
    const hasAdminAccess = await checkRolePermission(
      role,
      'ACCESS_ADMIN_DASHBOARD'
    );
    if (!hasAdminAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const teamId = auth.user.app_metadata?.teamId || auth.user.user_metadata?.teamId;

    // Get team statistics
    const teamStats = await prisma.team_members.groupBy({
      by: ['status'],
      _count: {
        _all: true
      },
      where: {
        teamId
      }
    });

    // Get subscription info
    const subscription = await prisma.subscription.findUnique({
      where: {
        teamId
      },
      select: {
        plan: true,
        status: true,
        seats: true,
        trialEndsAt: true,
        currentPeriodEndsAt: true
      }
    });

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = await prisma.activityLog.findMany({
      where: {
        teamId,
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10,
      select: {
        id: true,
        type: true,
        description: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Calculate team member status counts
    const activeMembers = teamStats.find((stat: any) => stat.status === 'ACTIVE')?._count._all ?? 0;
    const pendingMembers = teamStats.find((stat: any) => stat.status === 'PENDING')?._count._all ?? 0;
    const totalMembers = activeMembers + pendingMembers;

    // Calculate seat usage
    const seatLimit = subscription?.seats ?? 0;
    const seatUsagePercentage = seatLimit > 0 ? (totalMembers / seatLimit) * 100 : 0;

    // Prepare response data
    const dashboardData = {
      team: {
        activeMembers,
        pendingMembers,
        totalMembers,
        seatUsage: {
          used: totalMembers,
          total: seatLimit,
          percentage: Math.round(seatUsagePercentage)
        }
      },
      subscription: {
        plan: subscription?.plan ?? 'NO_PLAN',
        status: subscription?.status ?? 'INACTIVE',
        trialEndsAt: subscription?.trialEndsAt ?? null,
        currentPeriodEndsAt: subscription?.currentPeriodEndsAt ?? null
      },
      recentActivity
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error fetching admin dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
const getMiddleware = createMiddlewareChain([
  rateLimitMiddleware(),
  errorHandlingMiddleware(),
  routeAuthMiddleware({ includeUser: true }),
]);

export const GET = (req: NextRequest) =>
  getMiddleware((r, auth) => handleGet(r, auth))(req);
