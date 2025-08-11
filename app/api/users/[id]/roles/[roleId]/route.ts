import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createNoContentResponse, ApiError, ERROR_CODES } from '@/lib/api/common';
import { createRoleNotFoundError } from '@/lib/api/permission/error-handler';
import { PermissionValues } from '@/core/permission/models';

// DELETE /api/users/[id]/roles/[roleId] - Remove role from a user

export const DELETE = withValidatedServices({
  schema: z.object({}),
  requiredServices: ['permission'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
  handler: async ({ params, services }) => {
    const userId = params.id;
    const roleId = params.roleId;
    
    const ok = await services.permission.removeRoleFromUser(userId, roleId);
    if (!ok) {
      throw createRoleNotFoundError(roleId);
    }
    
    return createNoContentResponse();
  },
});