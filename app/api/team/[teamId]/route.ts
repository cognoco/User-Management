import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';
import { createTeamNotFoundError } from '@/lib/api/team/error-handler';

const UpdateTeamSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional()
});

export const GET = withValidatedServices({
  schema: z.object({}),
  requiredServices: ['team'],
  requireAuth: true,
  handler: async ({ params, services }) => {
    const teamId = params.teamId;
    const team = await services.team.getTeam(teamId);
    if (!team) {
      throw createTeamNotFoundError(teamId);
    }
    return createSuccessResponse({ team });
  },
});

export const PATCH = withValidatedServices({
  schema: UpdateTeamSchema,
  requiredServices: ['team'],
  requireAuth: true,
  handler: async ({ params, data, services }) => {
    const teamId = params.teamId;
    const result = await services.team.updateTeam(teamId, data);
    if (!result.success || !result.team) {
      throw new ApiError(ERROR_CODES.INVALID_REQUEST, result.error || 'Failed to update team', 400);
    }
    return createSuccessResponse({ team: result.team });
  },
});

export const DELETE = withValidatedServices({
  schema: z.object({}),
  requiredServices: ['team'],
  requireAuth: true,
  handler: async ({ params, services }) => {
    const teamId = params.teamId;
    const result = await services.team.deleteTeam(teamId);
    if (!result.success) {
      throw new ApiError(ERROR_CODES.INVALID_REQUEST, result.error || 'Failed to delete team', 400);
    }
    return createSuccessResponse({ success: true });
  },
});