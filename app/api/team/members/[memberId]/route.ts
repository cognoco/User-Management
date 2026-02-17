import { type NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/database/prisma';
import { z } from 'zod';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';
import { createTeamMemberNotFoundError } from '@/lib/api/team/error-handler';
import {
  createMiddlewareChain,
  errorHandlingMiddleware,
  routeAuthMiddleware
} from '@/middleware/createMiddlewareChain';
import type { AuthContext } from '@/core/config/interfaces';
import { Permission } from '@/lib/rbac/roles';

const paramSchema = z.object({ memberId: z.string().uuid() });

async function handleDelete(
  _req: NextRequest,
  auth: AuthContext,
  params: z.infer<typeof paramSchema>
) {
  const teamMember = await prisma.team_members.findUnique({
    where: { id: params.memberId },
    include: {
      team: { include: { members: { where: { role: 'ADMIN' } } } },
    },
  });

  if (!teamMember) {
    throw createTeamMemberNotFoundError();
  }

  const currentMembership = await prisma.team_members.findFirst({
    where: { teamId: teamMember.teamId, userId: auth.userId! },
  });

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

  if (teamMember.role === 'ADMIN' && teamMember.team.members.length === 1) {
    throw new ApiError(
      ERROR_CODES.INVALID_REQUEST,
      'Cannot remove the last admin from the team',
      400
    );
  }

  await prisma.team_members.delete({ where: { id: params.memberId } });

  return createSuccessResponse({ message: 'Team member removed successfully' });
}

const middleware = createMiddlewareChain([
  errorHandlingMiddleware(),
  routeAuthMiddleware({ requiredPermissions: [Permission.REMOVE_TEAM_MEMBER] })
]);

export const DELETE = (
  req: NextRequest,
  ctx: { params: { memberId: string } }
) => middleware((r, auth) => handleDelete(r, auth, paramSchema.parse(ctx.params)))(req);
