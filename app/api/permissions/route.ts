// GET /api/permissions - List all permissions
// POST /api/permissions - Not supported (permissions are static)

import { NextResponse } from 'next/server';
import { withValidatedServices, schemas } from '@/src/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';
import { PermissionValues } from '@/core/permission/models';

const getHandler = async ({ services }: { services: any }) => {
  const permissions = await services.permission.getAllPermissions();
  return createSuccessResponse({ permissions });
};

const postHandler = async () => {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
};

export const GET = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['permission'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
  handler: getHandler
});

export const POST = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['permission'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
  handler: postHandler
});
