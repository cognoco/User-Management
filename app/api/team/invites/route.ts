import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/database/prisma';
import { generateInviteToken } from '@/lib/utils/token';
import { sendTeamInviteEmail } from '@/lib/email/teamInvite';
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
  const invites = await prisma.team_members.findMany({
    where: { teamLicenseId: licenseId, status: 'pending' }
  });
  return createSuccessResponse(invites);
}
async function handleInvite(
  _req: NextRequest,
  auth: AuthContext | undefined,
  data: z.infer<typeof inviteSchema>
) {
  if (!auth?.userId) {
    throw new ApiError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401);
  }

  const invokingUser = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: {
      id: true,
      teamMemberships: { select: { teamId: true, role: true } },
    },
  });
  if (!invokingUser || !invokingUser.teamMemberships || invokingUser.teamMemberships.length === 0) {
    throw new ApiError(ERROR_CODES.FORBIDDEN, 'Invoking user not found or not part of any team', 403);
  }
  const invokingUserTeamId = invokingUser.teamMemberships[0].teamId;

  const targetLicense = await prisma.team_licenses.findUnique({
    where: { id: data.teamLicenseId },
    select: { teamId: true }
  });
  if (!targetLicense) {
    throw createTeamNotFoundError(data.teamLicenseId);
  }
  if (targetLicense.teamId !== invokingUserTeamId) {
    throw new ApiError(ERROR_CODES.FORBIDDEN, 'Forbidden: Cannot invite members to this team license.', 403);
  }

  const teamLicense = await prisma.team_licenses.findUnique({
    where: { id: data.teamLicenseId },
    select: { usedSeats: true, totalSeats: true },
  });
  if (!teamLicense) {
    throw createTeamNotFoundError(data.teamLicenseId);
  }
  if (teamLicense.usedSeats >= teamLicense.totalSeats) {
    throw new ApiError(ERROR_CODES.INVALID_REQUEST, 'Team has reached its seat limit', 400);
  }

  const existingMember = await prisma.team_members.findFirst({
    where: {
      OR: [
        { userId: invokingUser.id, teamLicenseId: data.teamLicenseId },
        { invitedEmail: data.email, teamLicenseId: data.teamLicenseId },
      ],
    },
  });
  if (existingMember) {
    throw createTeamMemberAlreadyExistsError();
  }

  const inviteToken = generateInviteToken();
  const invite = await prisma.team_members.create({
    data: {
      teamLicenseId: data.teamLicenseId,
      role: data.role,
      invitedEmail: data.email,
      invitedBy: invokingUser.id,
      inviteToken,
      inviteExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'pending',
    },
  });

  await prisma.team_licenses.update({
    where: { id: data.teamLicenseId },
    data: { usedSeats: { increment: 1 } },
  });

  await sendTeamInviteEmail({
    to: data.email,
    inviteToken,
    invitedByEmail: auth.user?.email || '',
    teamName: 'Your Team',
    role: data.role,
  });

  return createSuccessResponse(invite, 201);
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
