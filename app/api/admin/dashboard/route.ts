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
import { getApiTeamService } from '@/services/team/factory';

async function handleGet(_req: NextRequest, auth: AuthContext) {
  try {
    if (!auth.user || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (auth.user.app_metadata?.role || auth.user.user_metadata?.role || 'user') as Role;

    const hasAdminAccess = await checkRolePermission(
      role,
      'ACCESS_ADMIN_DASHBOARD'
    );
    if (!hasAdminAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const teamService = getApiTeamService();
    if (!teamService) {
      return NextResponse.json({ error: 'Team service unavailable' }, { status: 503 });
    }

    // Get user's teams via service layer
    const userTeams = await teamService.getUserTeams(auth.userId);
    const team = userTeams[0]; // Primary team

    if (!team) {
      return NextResponse.json({
        team: { activeMembers: 0, pendingMembers: 0, totalMembers: 0, seatUsage: { used: 0, total: 0, percentage: 0 } },
        subscription: { plan: 'TEAM', status: 'ACTIVE', trialEndsAt: null, currentPeriodEndsAt: null },
        recentActivity: [],
      });
    }

    // Get team members via service layer
    const members = await teamService.getTeamMembers(team.id);
    const activeMembers = members.filter(m => m.isActive).length;
    const pendingMembers = members.filter(m => !m.isActive).length;
    const totalMembers = members.length;

    // Get license/seat info (no service method yet — direct DB query)
    // TODO: Add getLicenseInfo to team service to eliminate this prisma import
    const membership = await prisma.team_members.findFirst({
      where: { user_id: auth.userId },
      select: { team_license_id: true },
    });

    const teamLicense = membership?.team_license_id
      ? await prisma.team_licenses.findUnique({
          where: { id: membership.team_license_id },
          select: { total_seats: true, used_seats: true },
        })
      : null;

    const seatLimit = teamLicense?.total_seats ?? 0;
    const seatUsagePercentage = seatLimit > 0 ? (totalMembers / seatLimit) * 100 : 0;

    const dashboardData = {
      team: {
        activeMembers,
        pendingMembers,
        totalMembers,
        seatUsage: {
          used: teamLicense?.used_seats ?? totalMembers,
          total: seatLimit,
          percentage: Math.round(seatUsagePercentage),
        },
      },
      subscription: {
        plan: 'TEAM',
        status: 'ACTIVE',
        trialEndsAt: null,
        currentPeriodEndsAt: null,
      },
      recentActivity: [],
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
