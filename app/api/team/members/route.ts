import { z } from 'zod';
import { createApiHandler } from '@/lib/api/route-helpers';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';
import type { AuthContext, ServiceContainer } from '@/core/config/interfaces';
import { NextRequest, NextResponse } from 'next/server';
import { Permission } from '@/lib/rbac/roles';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  status: z.enum(['active', 'pending', 'all']).optional().default('all'),
  sortBy: z.enum(['name', 'email', 'role', 'status', 'joinedAt']).optional().default('joinedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

const addMemberSchema = z.object({
  teamId: z.string(),
  userId: z.string(),
  role: z.string(),
});

async function handleGetMembers(
  _req: NextRequest,
  auth: AuthContext,
  data: z.infer<typeof querySchema>,
  services: ServiceContainer,
) {
  if (!services.team) {
    throw new ApiError(ERROR_CODES.SERVICE_UNAVAILABLE, 'Team service unavailable', 503);
  }

  // Use the service layer to get user's teams first
  const userTeams = await services.team.getUserTeams(auth.userId!);
  if (!userTeams || userTeams.length === 0) {
    throw new ApiError(ERROR_CODES.NOT_FOUND, 'Team not found', 404);
  }

  // Get members of the first team via service
  const teamId = userTeams[0].id;
  const members = await services.team.getTeamMembers(teamId);

  // Client-side pagination and filtering (service returns all members)
  let filtered = members;

  // TeamMember model doesn't have status; filtering reserved for future use

  if (data.search) {
    const search = data.search.toLowerCase();
    filtered = filtered.filter(
      (m) =>
        m.userId?.toLowerCase().includes(search) ||
        m.role?.toLowerCase().includes(search),
    );
  }

  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / data.limit);
  const start = (data.page - 1) * data.limit;
  const paged = filtered.slice(start, start + data.limit);

  return createSuccessResponse({
    users: paged,
    pagination: {
      page: data.page,
      limit: data.limit,
      totalCount,
      totalPages,
      hasNextPage: data.page < totalPages,
      hasPreviousPage: data.page > 1,
    },
  });
}

async function handleAddMember(
  _req: NextRequest,
  auth: AuthContext,
  data: z.infer<typeof addMemberSchema>,
  services: ServiceContainer,
) {
  if (!services.team) {
    throw new ApiError(ERROR_CODES.SERVICE_UNAVAILABLE, 'Team service unavailable', 503);
  }

  const result = await services.team.addTeamMember(
    data.teamId,
    data.userId,
    data.role,
  );

  if (!result.success || !result.member) {
    throw new ApiError(
      ERROR_CODES.INVALID_REQUEST,
      result.error || 'Failed to add member',
      400,
    );
  }

  return createSuccessResponse(result.member, 201);
}

export const GET = createApiHandler(querySchema, handleGetMembers as any, {
  requireAuth: true,
  requiredPermissions: [Permission.VIEW_TEAM_MEMBERS],
});

export const POST = createApiHandler(addMemberSchema, handleAddMember as any, {
  requireAuth: true,
  requiredPermissions: [Permission.INVITE_TEAM_MEMBER],
});
