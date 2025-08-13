import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';
import { createResourcePermissionResolver } from '@/lib/services/resource-permission-resolver.service';

const querySchema = z.object({
  userId: z.string(),
  permission: z.string(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
});

const getHandler = async ({ data, services }: { data: z.infer<typeof querySchema>, services: any }) => {
  const resolver = createResourcePermissionResolver();
  const { userId, permission, resourceType, resourceId } = data;

  let allowed: boolean;
  if (resourceType && resourceId) {
    allowed = await services.permission.hasResourcePermission(
      userId,
      permission as any,
      resourceType,
      resourceId,
    );
  } else {
    allowed = await services.permission.hasPermission(userId, permission as any);
  }

  const userRoles = await services.permission.getUserRoles(userId);
  const contributingRoles: string[] = [];
  for (const r of userRoles) {
    const perms = await services.role.getEffectivePermissions(r.roleId);
    if (perms.includes(permission as any)) {
      contributingRoles.push(r.roleId);
    }
  }

  let inheritance: any[] = [];
  if (resourceType && resourceId) {
    inheritance = await resolver.getResourceAncestors(resourceType, resourceId);
  }

  return createSuccessResponse({
    allowed,
    roles: contributingRoles,
    inheritance,
  });
};

export const GET = withValidatedServices({
  schema: querySchema,
  requiredServices: ['permission', 'role'],
  requireAuth: true,
  handler: getHandler
});
