import { z } from 'zod';
import { createApiHandler, emptySchema } from '@/lib/api/route-helpers';
import {
  createSuccessResponse,
  createCreatedResponse,
  ApiError,
  ERROR_CODES
} from '@/lib/api/common';
import type { AuthContext, ServiceContainer } from '@/core/config/interfaces';

const CreateTeamSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional()
});

async function handleGet(
  _req: Request,
  auth: AuthContext,
  _data: unknown,
  services: ServiceContainer
) {
  if (!services.team) throw new ApiError(ERROR_CODES.SERVICE_UNAVAILABLE, 'Team service unavailable', 503);
  const teams = await services.team.getUserTeams(auth.userId!);
  return createSuccessResponse({ teams });
}

async function handlePost(
  _req: Request,
  auth: AuthContext,
  data: z.infer<typeof CreateTeamSchema>,
  services: ServiceContainer
) {
  if (!services.team) throw new ApiError(ERROR_CODES.SERVICE_UNAVAILABLE, 'Team service unavailable', 503);
  const result = await services.team.createTeam(auth.userId!, data);
  if (!result.success || !result.team) {
    throw new ApiError(ERROR_CODES.INVALID_REQUEST, result.error || 'Failed to create team', 400);
  }
  return createCreatedResponse({ team: result.team });
}

export const GET = createApiHandler(emptySchema, handleGet, { requireAuth: true });
export const POST = createApiHandler(CreateTeamSchema, handlePost, { requireAuth: true });
