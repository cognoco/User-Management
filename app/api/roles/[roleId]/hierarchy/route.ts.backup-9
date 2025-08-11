import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { createApiHandler, emptySchema } from '@/lib/api/route-helpers';
import { createSuccessResponse } from '@/lib/api/common';
import { PermissionValues } from '@/core/permission/models';

const parentSchema = z.object({
  parentRoleId: z.string().nullable(),
});

type ParentPayload = z.infer<typeof parentSchema>;

export const GET = createApiHandler(
  emptySchema,
  async (req: NextRequest, authContext: any, data: any, services: any) => {
    const url = new URL(req.url);
    const roleId = url.pathname.split('/')[3]; // Extract roleId from /api/roles/{roleId}/hierarchy
    const ancestors = await services.role.getAncestorRoles(roleId);
    const descendants = await services.role.getDescendantRoles(roleId);
    return createSuccessResponse({ ancestors, descendants });
  },
  {
    requireAuth: true,
    requiredPermissions: [PermissionValues.MANAGE_ROLES],
  }
);

export const PUT = createApiHandler(
  parentSchema,
  async (req: NextRequest, authContext: any, data: ParentPayload, services: any) => {
    const url = new URL(req.url);
    const roleId = url.pathname.split('/')[3]; // Extract roleId from /api/roles/{roleId}/hierarchy
    await services.role.setParentRole(roleId, data.parentRoleId);
    return createSuccessResponse({});
  },
  {
    requireAuth: true,
    requiredPermissions: [PermissionValues.MANAGE_ROLES],
  }
);
