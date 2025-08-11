import { z } from 'zod';
import { withValidatedServices, schemas } from '@/lib/api/with-services';
import {
  createSuccessResponse,
  createCreatedResponse,
  ApiError,
  ERROR_CODES
} from '@/lib/api/common';

const CreateTeamSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional()
});

export const GET = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['team'],
  requireAuth: true,
  handler: async ({ userId, services }) => {
    const teams = await services.team.getUserTeams(userId!);
    return createSuccessResponse({ teams });
  }
});

export const POST = withValidatedServices({
  schema: CreateTeamSchema,
  requiredServices: ['team'],
  requireAuth: true,
  handler: async ({ userId, data, services }) => {
    const result = await services.team.createTeam(userId!, data);
    if (!result.success || !result.team) {
      throw new ApiError(ERROR_CODES.INVALID_REQUEST, result.error || 'Failed to create team', 400);
    }
    return createCreatedResponse({ team: result.team });
  }
});
