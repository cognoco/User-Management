import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createApiHandler, emptySchema } from '@/lib/api/route-helpers';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';
import { createTeamMemberNotFoundError } from '@/lib/api/team/error-handler';
import type { AuthContext, ServiceContainer } from '@/core/config/interfaces';
import { Permission } from '@/lib/rbac/roles';

const paramSchema = z.object({ memberId: z.string().uuid() });

async function handleDelete(
  _req: NextRequest,
  auth: AuthContext,
  _data: unknown,
  services: ServiceContainer,
  memberId: string
) {
  if (!services.team) {
    throw new ApiError(ERROR_CODES.SERVICE_UNAVAILABLE, 'Team service unavailable', 503);
  }

  // Look up the member by record ID
  const teamMember = await services.team.getTeamMemberById(memberId);

  if (!teamMember) {
    throw createTeamMemberNotFoundError();
  }

  // Check invoking user is in the same team
  const members = await services.team.getTeamMembers(teamMember.teamId);
  const currentMembership = members.find(m => m.userId === auth.userId);

  if (!currentMembership) {
    throw new ApiError(
      ERROR_CODES.FORBIDDEN,
      'Cannot modify members of another team',
      403
    );
  }

  if (teamMember.userId === auth.userId) {
    throw new ApiError(
      ERROR_CODES.INVALID_REQUEST,
      'Cannot remove yourself from the team',
      400
    );
  }

  // Check last admin
  if (teamMember.role === 'ADMIN') {
    const admins = members.filter(m => m.role === 'ADMIN');
    if (admins.length <= 1) {
      throw new ApiError(
        ERROR_CODES.INVALID_REQUEST,
        'Cannot remove the last admin from the team',
        400
      );
    }
  }

  const result = await services.team.removeTeamMember(teamMember.teamId, teamMember.userId);

  if (!result.success) {
    throw new ApiError(ERROR_CODES.OPERATION_FAILED, result.error || 'Failed to remove team member', 500);
  }

  return createSuccessResponse({ message: 'Team member removed successfully' });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ memberId: string }> }
) {
  const parsed = paramSchema.parse(await ctx.params);
  return createApiHandler(
    emptySchema,
    (r, a, d, s) => handleDelete(r, a, d, s, parsed.memberId),
    { requireAuth: true, requiredPermissions: [Permission.REMOVE_TEAM_MEMBER] }
  )(req);
}
