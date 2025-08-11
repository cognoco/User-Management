import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';
import { PermissionValues } from '@/core/permission/models';

const parentSchema = z.object({
  parentRoleId: z.string().nullable(),
});

type ParentPayload = z.infer<typeof parentSchema>;

export const GET = withValidatedServices({
  schema: z.object({}),
  requiredServices: ['role'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
  handler: async ({ params, services }) => {
    const roleId = params.roleId;
    const ancestors = await services.role.getAncestorRoles(roleId);
    const descendants = await services.role.getDescendantRoles(roleId);
    return createSuccessResponse({ ancestors, descendants });
  },
});

export const PUT = withValidatedServices({
  schema: parentSchema,
  requiredServices: ['role'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
  handler: async ({ params, data, services }) => {
    const roleId = params.roleId;
    await services.role.setParentRole(roleId, data.parentRoleId);
    return createSuccessResponse({});
  },
});