import { createSuccessResponse } from '@/lib/api/common';
import { withValidatedServices } from '@/lib/api/with-services';
import { z } from 'zod';

const myPermissionsSchema = z.object({});

export const GET = withValidatedServices({
  schema: myPermissionsSchema,
  requiredServices: ['permissionService'],
  requireAuth: true,
  handler: async ({ services, userId, data }) => {
    if (!userId) {
      return createSuccessResponse({ 
        roles: [], 
        permissions: [], 
        resourcePermissions: [] 
      });
    }

    const assignments = await services.permissionService.getUserRoles(userId);
    const roleEntities = await Promise.all(
      assignments.map((r: any) => services.permissionService.getRoleById(r.roleId))
    );
    const roles = roleEntities.filter(Boolean).map((r: any) => r!.name);
    const permissions = new Set<string>();
    roleEntities.forEach((r: any) => r?.permissions.forEach((p: string) => permissions.add(p)));
    
    return createSuccessResponse({
      roles,
      permissions: Array.from(permissions),
      resourcePermissions: []
    });
  }
});
