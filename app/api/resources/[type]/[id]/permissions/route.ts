// GET /api/resources/[type]/[id]/permissions - List permissions for a resource
// GET /api/resources/[type]/[id]/users - List users with permissions for a resource

import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createPaginatedResponse, ApiError, ERROR_CODES } from '@/lib/api/common';
import { checkPermission } from '@/lib/auth/permissionCheck';
import { PermissionValues } from '@/core/permission/models';


const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),
  pageSize: z.coerce.number().int().positive().max(100).default(20).optional(),
  userId: z.string().optional(),
  permission: z.string().optional(),
});

export const GET = withValidatedServices({
  schema: querySchema,
  requiredServices: ['permission'],
  requireAuth: true,
  handler: async ({ data, userId, services, params }) => {
    const resourceType = params!.type;
    const resourceId = params!.id;
    
    const allowed = await checkPermission(
      userId!,
      PermissionValues.MANAGE_ROLES,
      resourceType,
      resourceId,
    );
    const globalAllowed = await checkPermission(
      userId!,
      PermissionValues.MANAGE_ROLES,
    );
    if (!allowed && !globalAllowed) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 'Forbidden', 403);
    }
    
    let permissions = await services.permission!.getPermissionsForResource(resourceType, resourceId);
    if (data.userId) {
      permissions = permissions.filter((p) => p.userId === data.userId);
    }
    if (data.permission) {
      permissions = permissions.filter((p) => p.permission === data.permission);
    }
    
    const page = data.page ?? 1;
    const pageSize = data.pageSize ?? 20;
    const totalItems = permissions.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const start = (page - 1) * pageSize;
    const paginated = permissions.slice(start, start + pageSize);
    
    return createPaginatedResponse(paginated, {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    });
  },
});
