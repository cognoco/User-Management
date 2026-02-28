import { type NextRequest } from 'next/server';
import { z } from 'zod';
import type { AuthContext } from '@/core/config/interfaces';
import { logUserAction } from '@/lib/audit/auditLogger';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';
import { withErrorHandling } from '@/middleware/error-handling';
import { withValidation } from '@/middleware/validation';
import { createTeamMemberNotFoundError } from '@/lib/api/team/error-handler';
import { withSecurity } from '@/middleware/with-security';
import { withRouteAuth } from '@/middleware/auth';
import { getServiceContainer } from '@/lib/config/service-container';

const updateRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
});

const paramSchema = z.object({ memberId: z.string().uuid() });

async function handlePatch(
  _req: NextRequest,
  auth: AuthContext,
  data: z.infer<typeof updateRoleSchema>,
  memberId: string
) {
  const teamService = getServiceContainer().team;
  if (!teamService) {
    throw new ApiError(ERROR_CODES.INTERNAL_ERROR, 'Team service not available', 500);
  }

  // Look up the target member by their record ID
  const targetMember = await teamService.getTeamMemberById(memberId);
  if (!targetMember) {
    throw createTeamMemberNotFoundError();
  }

  // Verify the calling user is an admin on the same team
  const isAdmin = await teamService.hasTeamRole(targetMember.teamId, auth.userId!, 'admin');
  if (!isAdmin) {
    await logUserAction({
      userId: auth.userId!,
      action: 'TEAM_ROLE_UPDATE_ATTEMPT',
      status: 'FAILURE',
      targetResourceType: 'team_member',
      targetResourceId: memberId,
      details: { reason: 'Only admins can update member roles' }
    });
    throw new ApiError(ERROR_CODES.FORBIDDEN, 'Only admins can update member roles', 403);
  }

  // Update the member's role via the service layer
  const result = await teamService.updateTeamMember(targetMember.teamId, targetMember.userId, { role: data.role });

  if (!result.success) {
    await logUserAction({
      userId: auth.userId!,
      action: 'TEAM_ROLE_UPDATE_NOT_FOUND',
      status: 'FAILURE',
      targetResourceType: 'team_member',
      targetResourceId: memberId,
      details: { error: result.error }
    });
    throw createTeamMemberNotFoundError();
  }

  await logUserAction({
    userId: auth.userId!,
    action: 'TEAM_ROLE_UPDATE_SUCCESS',
    status: 'SUCCESS',
    targetResourceType: 'team_member',
    targetResourceId: memberId,
    details: { newRole: data.role }
  });

  return createSuccessResponse(result.member);
}

async function handler(
  req: NextRequest,
  context: { params: { memberId: string } }
) {
  const params = paramSchema.parse(context.params);
  return withRouteAuth(
    (r, auth) =>
      withValidation(updateRoleSchema, (r2, data) => handlePatch(r2, auth as AuthContext, data, params.memberId), r),
    req
  );
}

export const PATCH = (
  req: NextRequest,
  ctx: { params: { memberId: string } }
) => withSecurity((r) => withErrorHandling((req2) => handler(req2, ctx), r))(req);
