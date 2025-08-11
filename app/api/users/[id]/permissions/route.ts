import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';
import { PermissionValues, type Permission } from '@/core/permission/models';

// GET /api/users/[id]/permissions - Get effective permissions for a user

export const GET = withValidatedServices({
  schema: z.object({}),
  requiredServices: ['permission'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
  handler: async ({ params, services }) => {
    const userId = params.id;
    const roles = await services.permission.getUserRoles(userId);
    const permissions = new Set<Permission>();
    
    for (const role of roles) {
      const roleData = await services.permission.getRoleById(role.roleId);
      roleData?.permissions.forEach((p) => permissions.add(p));
    }
    
    return createSuccessResponse({ permissions: Array.from(permissions) });
  },
});