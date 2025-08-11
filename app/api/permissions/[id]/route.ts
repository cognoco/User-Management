import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';
import { PermissionValues, Permission } from '@/core/permission/models';
import { permissionCategoryMap } from '@/lib/rbac/permission-categories';
import { isPermission } from '@/lib/rbac/roles';

export const GET = withValidatedServices({
  schema: z.object({}),
  requiredServices: [],
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
  rateLimit: { windowMs: 15 * 60 * 1000, max: 50 },
  handler: async ({ params }) => {
    const id = params.id;
    if (!isPermission(id)) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Not Found', 404);
    }
    const category = permissionCategoryMap[id as Permission];
    return createSuccessResponse({ id, category });
  },
});

const methodNotAllowed = withValidatedServices({
  schema: z.object({}),
  requiredServices: [],
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
  handler: async () => {
    throw new ApiError(ERROR_CODES.INVALID_REQUEST, 'Method Not Allowed', 405);
  },
});

export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;
