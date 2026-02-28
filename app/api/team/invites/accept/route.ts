import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { createApiHandler } from '@/lib/api/route-helpers';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';
import type { AuthContext, ServiceContainer } from '@/core/config/interfaces';

const acceptInviteSchema = z.object({ token: z.string().optional() });

async function handleAccept(
  req: NextRequest,
  auth: AuthContext | undefined,
  data: z.infer<typeof acceptInviteSchema> | undefined,
  services: ServiceContainer
) {
  if (!auth?.userId) {
    throw new ApiError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401);
  }

  if (!services.team) {
    throw new ApiError(ERROR_CODES.SERVICE_UNAVAILABLE, 'Team service unavailable', 503);
  }

  const userEmail = auth.user?.email;
  if (!userEmail) {
    throw new ApiError(ERROR_CODES.INVALID_REQUEST, 'User email not available', 400);
  }

  // Find pending invitations for this user's email
  const invitations = await services.team.getUserInvitations(userEmail);
  if (!invitations || invitations.length === 0) {
    throw new ApiError(ERROR_CODES.INVALID_REQUEST, 'Invalid or expired invitation', 400);
  }

  // Accept the first pending invitation (or a specific one if token/id provided)
  const invite = invitations[0];
  const result = await services.team.acceptInvitation(invite.id, auth.userId);

  if (!result.success) {
    throw new ApiError(ERROR_CODES.OPERATION_FAILED, result.error || 'Failed to accept invitation', 500);
  }

  return createSuccessResponse(result.member);
}

export const POST = createApiHandler(acceptInviteSchema, handleAccept, {
  requireAuth: true,
  includeUser: true,
});
