import { z } from 'zod';
import { NextResponse } from 'next/server';
import { createApiHandler, emptySchema } from '@/lib/api/route-helpers';
import {
  createSuccessResponse,
  ApiError,
  ERROR_CODES
} from '@/lib/api/common';
import {
  createTeamNotFoundError
} from '@/lib/api/team/error-handler';
import type { AuthContext, ServiceContainer } from '@/core/config/interfaces';

const UpdateTeamSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional()
});

const ParamSchema = z.object({ teamId: z.string().min(1, 'Invalid team id') });

async function handleGet(
  _req: Request,
  _auth: AuthContext,
  _data: unknown,
  services: ServiceContainer,
  teamId: string
) {
  const team = await services.team.getTeam(teamId);
  if (!team) {
    throw createTeamNotFoundError(teamId);
  }
  return createSuccessResponse({ team });
}

async function handlePatch(
  _req: Request,
  _auth: AuthContext,
  data: z.infer<typeof UpdateTeamSchema>,
  services: ServiceContainer,
  teamId: string
) {
  const result = await services.team.updateTeam(teamId, data);
  if (!result.success || !result.team) {
    throw new ApiError(ERROR_CODES.INVALID_REQUEST, result.error || 'Failed to update team', 400);
  }
  return createSuccessResponse({ team: result.team });
}

async function handleDelete(
  _req: Request,
  _auth: AuthContext,
  _data: unknown,
  services: ServiceContainer,
  teamId: string
) {
  const result = await services.team.deleteTeam(teamId);
  if (!result.success) {
    throw new ApiError(ERROR_CODES.INVALID_REQUEST, result.error || 'Failed to delete team', 400);
  }
  return createSuccessResponse({ success: true });
}

export const GET = (
  req: Request,
  ctx: { params: { teamId: string } }
) => {
  const parsed = ParamSchema.safeParse(ctx.params);
  if (!parsed.success) {
    return NextResponse.json(
      new ApiError(ERROR_CODES.INVALID_REQUEST, parsed.error.message, 400).toResponse(),
      { status: 400 }
    );
  }
  return createApiHandler(emptySchema, (r, a, d, s) => handleGet(r, a, d, s, parsed.data.teamId), { requireAuth: true })(req);
};

export const PATCH = (
  req: Request,
  ctx: { params: { teamId: string } }
) => {
  const parsed = ParamSchema.safeParse(ctx.params);
  if (!parsed.success) {
    return NextResponse.json(
      new ApiError(ERROR_CODES.INVALID_REQUEST, parsed.error.message, 400).toResponse(),
      { status: 400 }
    );
  }
  return createApiHandler(UpdateTeamSchema, (r, a, d, s) => handlePatch(r, a, d, s, parsed.data.teamId), { requireAuth: true })(req);
};

export const DELETE = (
  req: Request,
  ctx: { params: { teamId: string } }
) => {
  const parsed = ParamSchema.safeParse(ctx.params);
  if (!parsed.success) {
    return NextResponse.json(
      new ApiError(ERROR_CODES.INVALID_REQUEST, parsed.error.message, 400).toResponse(),
      { status: 400 }
    );
  }
  return createApiHandler(emptySchema, (r, a, d, s) => handleDelete(r, a, d, s, parsed.data.teamId), { requireAuth: true })(req);
};
