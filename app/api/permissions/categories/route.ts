import { withValidatedServices, schemas } from '@/src/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';
import { PermissionValues } from '@/core/permission/models';
import { listPermissionCategories } from '@/lib/rbac/permission-categories';

const getHandler = async () => {
  const categories = listPermissionCategories();
  return createSuccessResponse({ categories });
};

export const GET = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['permission'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
  handler: getHandler
});
