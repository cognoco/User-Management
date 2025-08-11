import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { createSuccessResponse } from '@/lib/api/common';
import { createApiHandler } from '@/lib/api/route-helpers';
import { PermissionValues, type Permission } from '@/core/permission/models';

// GET /api/users/[id]/permissions - Get effective permissions for a user

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
  const permissions = new Set<Permission>();
  for (const role of roles) {
    const roleData = await services.permission.getRoleById(role.roleId);
    roleData?.permissions.forEach((p) => permissions.add(p));
  }
  return createSuccessResponse({ permissions: Array.from(permissions) });
}

export const GET = createApiHandler(z.object({}), handleGet, {
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
});
