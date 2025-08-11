import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse, createNoContentResponse, ApiError, ERROR_CODES } from '@/lib/api/common';
import { mapPermissionServiceError } from '@/lib/api/permission/error-handler';
import { PermissionValues } from '@/core/permission/models';

const modifySchema = z.object({
  permission: z.string(),
});

type Modify = z.infer<typeof modifySchema>;

export const GET = withValidatedServices({
  schema: z.object({}),
  requiredServices: ['permission'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
  handler: async ({ params, services }) => {
    const roleId = params.roleId;
    const permissions = await services.permission.getRolePermissions(roleId);
    return createSuccessResponse({ permissions });
  },
});

export const POST = withValidatedServices({
  schema: modifySchema,
  requiredServices: ['permission'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
  handler: async ({ params, data, services }) => {
    const roleId = params.roleId;
    try {
      const permission = await services.permission.addPermissionToRole(
        roleId,
        data.permission,
      );
      return createSuccessResponse({ permission });
    } catch (e) {
      throw mapPermissionServiceError(e as Error);
    }
  },
});

export const DELETE = withValidatedServices({
  schema: modifySchema,
  requiredServices: ['permission'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
  handler: async ({ params, data, services }) => {
    const roleId = params.roleId;
    try {
      await services.permission.removePermissionFromRole(roleId, data.permission);
      return createNoContentResponse();
    } catch (e) {
      throw mapPermissionServiceError(e as Error);
    }
  },
});