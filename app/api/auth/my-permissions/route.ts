import { type NextRequest } from 'next/server';
import { createSuccessResponse } from '@/lib/api/common';
import { createApiHandler } from '@/lib/api/route-helpers';
import { z } from 'zod';

const myPermissionsSchema = z.object({});

export const GET = createApiHandler(
  myPermissionsSchema,
  async (_req: NextRequest, authContext: any, _data: any, services: any) => {
    if (!authContext.userId) {
      return createSuccessResponse({ 
        roles: [], 
        permissions: [], 
        resourcePermissions: [] 
      });
    }

    const assignments = await services.permission!.getUserRoles(authContext.userId);
    const roleEntities = await Promise.all(
      assignments.map((r: any) => services.permission!.getRoleById(r.roleId))
    );
    const roles = roleEntities.filter(Boolean).map((r: any) => r!.name);
    const permissions = new Set<string>();
    roleEntities.forEach((r: any) => r?.permissions.forEach((p: string) => permissions.add(p)));
    
    return createSuccessResponse({
      roles,
      permissions: Array.from(permissions),
      resourcePermissions: []
    });
  },
  { requireAuth: true }
);
