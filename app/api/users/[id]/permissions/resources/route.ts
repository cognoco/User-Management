import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';
import { PermissionValues } from '@/core/permission/models';

// GET /api/users/[id]/permissions/resources - Get resource permissions for a user

const querySchema = z.object({
  resourceType: z.string().optional(),
  sortBy: z.enum(['created', 'type']).optional().default('created'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
});
type Query = z.infer<typeof querySchema>;

export const GET = withValidatedServices({
  schema: querySchema,
  requiredServices: ['permission'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
  handler: async ({ params, data, services }) => {
    const userId = params.id;
    let permissions = await services.permission.getUserResourcePermissions(userId);
    
    if (data.resourceType) {
      permissions = permissions.filter((p) => p.resourceType === data.resourceType);
    }
    
    if (data.sortBy === 'type') {
      permissions.sort((a, b) => a.resourceType.localeCompare(b.resourceType));
    } else {
      permissions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }
    
    if (data.order === 'desc') {
      permissions.reverse();
    }
    
    return createSuccessResponse({ permissions });
  },
});