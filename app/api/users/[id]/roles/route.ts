import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { createSuccessResponse, createCreatedResponse } from '@/lib/api/common';
import { withValidatedServices, schemas } from '@/lib/api/with-services';
import { mapPermissionServiceError } from '@/lib/api/permission/error-handler';
import { PermissionValues } from '@/core/permission/models';

// GET /api/users/[id]/roles - Get roles for a user
// POST /api/users/[id]/roles - Assign roles to a user

const assignSchema = z.object({
  roleId: z.string(),
  expiresAt: z.string().optional(),
});

type AssignRole = z.infer<typeof assignSchema>;

function getUserId(req: NextRequest): string {
  const url = new URL(req.url);
  return url.pathname.split('/')[3];
}

async function handleGet(
  req: NextRequest,
  _auth: any,
  _data: unknown,
  services: any,
) {
  const userId = getUserId(req);
  const roles = await services.permission.getUserRoles(userId);
  return createSuccessResponse({ roles });
}

async function handlePost(
  req: NextRequest,
  auth: any,
  data: AssignRole,
  services: any,
) {
  const userId = getUserId(req);
  try {
    const role = await services.permission.assignRoleToUser(
      userId,
      data.roleId,
      auth.userId,
      data.expiresAt ? new Date(data.expiresAt) : undefined,
    );
    return createCreatedResponse({ role });
  } catch (e) {
    throw mapPermissionServiceError(e as Error);
  }
}

export const GET = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['permission'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
  handler: async ({ request, services }) => {
    return await handleGet(request, null, null, services);
  }
});

export const POST = withValidatedServices({
  schema: assignSchema,
  requiredServices: ['permission'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
  handler: async ({ request, userId, data, services }) => {
    return await handlePost(request, { userId }, data, services);
  }
});
