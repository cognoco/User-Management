import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { createNoContentResponse } from '@/lib/api/common';
import { createApiHandler } from '@/lib/api/route-helpers';
import { createRoleNotFoundError } from '@/lib/api/permission/error-handler';
import { PermissionValues } from '@/core/permission/models';

// DELETE /api/users/[id]/roles/[roleId] - Remove role from a user

function getIds(req: NextRequest): { userId: string; roleId: string } {
  const parts = new URL(req.url).pathname.split('/');
  return { userId: parts[3], roleId: parts[5] };
}

async function handleDelete(
  req: NextRequest,
  _auth: any,
  _data: unknown,
  services: any,
) {
  const { userId, roleId } = getIds(req);
  const ok = await services.permission.removeRoleFromUser(userId, roleId);
  if (!ok) {
    throw createRoleNotFoundError(roleId);
  }
  return createNoContentResponse();
}

export const DELETE = createApiHandler(z.object({}), handleDelete, {
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
});
