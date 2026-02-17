import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/database/prisma';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';
import { createTeamMemberNotFoundError } from '@/lib/api/team/error-handler';
import {
  createMiddlewareChain,
  errorHandlingMiddleware,
  routeAuthMiddleware,
  validationMiddleware
} from '@/middleware/createMiddlewareChain';
import type { AuthContext } from '@/core/config/interfaces';

const acceptInviteSchema = z.object({ token: z.string() });

async function handleAccept(
  req: NextRequest,
  auth?: AuthContext,
  data?: z.infer<typeof acceptInviteSchema>
) {
  if (!data) {
    try {
      const body = await req.json();
      const result = acceptInviteSchema.safeParse(body);
      if (!result.success) {
        throw new ApiError(ERROR_CODES.INVALID_REQUEST, 'Invalid token', 400);
      }
      data = result.data;
    } catch {
      throw new ApiError(ERROR_CODES.INVALID_REQUEST, 'Invalid request body', 400);
    }
  }

  const token = data.token;

  if (!auth?.userId) {
    throw new ApiError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401);
  }

  const invite = await prisma.team_members.findUnique({
    where: { inviteToken: token },
    include: { teamLicense: true },
  });
  if (!invite) {
    throw new ApiError(ERROR_CODES.INVALID_REQUEST, 'Invalid or expired invitation', 400);
  }

  if (invite.inviteExpires && invite.inviteExpires < new Date()) {
    throw new ApiError(ERROR_CODES.INVALID_REQUEST, 'Invitation has expired', 400);
  }

  if (invite.invitedEmail !== auth.user.email) {
    throw new ApiError(ERROR_CODES.FORBIDDEN, 'This invitation was sent to a different email address', 403);
  }

  try {
    const updated = await prisma.team_members.update({
      where: { id: invite.id },
      data: {
        userId: auth.userId,
        status: 'active',
        inviteToken: null,
        inviteExpires: null,
      },
    });
    return createSuccessResponse(updated);
  } catch (e) {
    throw createTeamMemberNotFoundError();
  }
}

const middleware = createMiddlewareChain([
  errorHandlingMiddleware(),
  routeAuthMiddleware({ includeUser: true }),
  validationMiddleware(acceptInviteSchema)
]);

export const POST = middleware(handleAccept);
