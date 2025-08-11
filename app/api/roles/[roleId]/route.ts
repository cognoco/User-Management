import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse, createNoContentResponse, ApiError, ERROR_CODES } from '@/lib/api/common';
import { mapPermissionServiceError, createRoleNotFoundError } from '@/lib/api/permission/error-handler';
import { PermissionValues } from '@/core/permission/models';

const updateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

type UpdateRole = z.infer<typeof updateSchema>;

export const GET = withValidatedServices({
  schema: z.object({}),
  requiredServices: ['permission'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
  handler: async ({ params, services }) => {
    const id = params.roleId;
    const role = await services.permission.getRoleById(id);
    if (!role) {
      throw createRoleNotFoundError(id);
    }
    return createSuccessResponse({ role });
  },
});

export const PATCH = withValidatedServices({
  schema: updateSchema,
  requiredServices: ['permission'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
  handler: async ({ params, data, auth, services }) => {
    const id = params.roleId;
    try {
      const role = await services.permission.updateRole(id, data, auth.userId);
      return createSuccessResponse({ role });
    } catch (e) {
      throw mapPermissionServiceError(e as Error);
    }
  },
});

export const PUT = withValidatedServices({
  schema: updateSchema,
  requiredServices: ['permission'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
  handler: async ({ params, data, auth, services }) => {
    const id = params.roleId;
    try {
      const role = await services.permission.updateRole(id, data, auth.userId);
      return createSuccessResponse({ role });
    } catch (e) {
      throw mapPermissionServiceError(e as Error);
    }
  },
});

export const DELETE = withValidatedServices({
  schema: z.object({}),
  requiredServices: ['permission'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
  handler: async ({ params, auth, services }) => {
    const id = params.roleId;
    const ok = await services.permission.deleteRole(id, auth.userId);
    if (!ok) {
      throw createRoleNotFoundError(id);
    }
    return createNoContentResponse();
  },
});