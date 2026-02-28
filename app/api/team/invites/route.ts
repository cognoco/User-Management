import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { Permission } from '@/lib/rbac/roles';

import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';
import {
  createMiddlewareChain,
  errorHandlingMiddleware,
  routeAuthMiddleware,
  validationMiddleware
} from '@/middleware/createMiddlewareChain';
import type { AuthContext } from '@/core/config/interfaces';
import {
  createTeamNotFoundError,
  createTeamMemberAlreadyExistsError
} from '@/lib/api/team/error-handler';
import { getApiTeamService } from '@/services/team/factory';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']),
  teamLicenseId: z.string(),
});

async function listInvites(req: NextRequest, _auth: AuthContext) {
  const url = new URL(req.url);
  const licenseId = url.searchParams.get('teamLicenseId');
  if (!licenseId) {
    return createSuccessResponse([], 200);
  }

  const teamService = getApiTeamService();
  if (!teamService) {
    throw new ApiError(ERROR_CODES.INTERNAL_ERROR, 'Team service unavailable', 500);
  }

  const invitations = await teamService.getTeamInvitations(licenseId);
  return createSuccessResponse(invitations);
}

async function handleInvite(
  _req: NextRequest,
  auth: AuthContext | undefined,
  data: z.infer<typeof inviteSchema>
) {
  if (!auth?.userId) {
    throw new ApiError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401);
  }

  const teamService = getApiTeamService();
  if (!teamService) {
    throw new ApiError(ERROR_CODES.INTERNAL_ERROR, 'Team service unavailable', 500);
  }

  // Verify the invoking user is a member of this team
  const isMember = await teamService.isTeamMember(data.teamLicenseId, auth.userId);
  if (!isMember) {
    throw new ApiError(ERROR_CODES.FORBIDDEN, 'Invoking user not found or not part of this team', 403);
  }

  // Check the team exists (getTeam returns null if not found)
  const team = await teamService.getTeam(data.teamLicenseId);
  if (!team) {
    throw createTeamNotFoundError(data.teamLicenseId);
  }

  // Check for existing invitation with same email
  const existingInvitations = await teamService.getTeamInvitations(data.teamLicenseId);
  const alreadyInvited = existingInvitations.some(
    (inv) => inv.email === data.email
  );
  if (alreadyInvited) {
    throw createTeamMemberAlreadyExistsError();
  }

  // Create the invitation via the service (handles seat checks and increment)
  const result = await teamService.inviteToTeam(data.teamLicenseId, {
    email: data.email,
    role: data.role,
  });

  if (!result.success) {
    throw new ApiError(
      ERROR_CODES.INVALID_REQUEST,
      result.error || 'Failed to create invitation',
      400
    );
  }

  return createSuccessResponse(result.invitation, 201);
}

const getMiddleware = createMiddlewareChain([
  errorHandlingMiddleware(),
  routeAuthMiddleware({ requiredPermissions: [Permission.INVITE_TEAM_MEMBER], includeUser: true })
]);

const postMiddleware = createMiddlewareChain([
  errorHandlingMiddleware(),
  routeAuthMiddleware({ requiredPermissions: [Permission.INVITE_TEAM_MEMBER], includeUser: true }),
  validationMiddleware(inviteSchema)
]);

export const POST = postMiddleware(handleInvite);
export const GET = getMiddleware(listInvites);
