// GET /api/resources/[type]/[id]/permissions - List permissions for a resource
// GET /api/resources/[type]/[id]/users - List users with permissions for a resource

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createApiHandler } from '@/lib/api/route-helpers';
import { createPaginatedResponse } from '@/lib/api/common';
import { checkPermission } from '@/lib/auth/permissionCheck';
import { PermissionValues } from '@/core/permission/models';
import type { AuthContext, ServiceContainer } from '@/core/config/interfaces';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),
  pageSize: z.coerce.number().int().positive().max(100).default(20).optional(),
  userId: z.string().optional(),
  permission: z.string().optional(),
});
type Query = z.infer<typeof querySchema>;

async function handleGet(
  _req: NextRequest,
  auth: AuthContext,
  query: Query,
  services: ServiceContainer,
  resourceType: string,
  resourceId: string,
) {
  const userId = auth.userId!;
  const allowed = await checkPermission(
    userId,
    PermissionValues.MANAGE_ROLES,
    resourceType,
    resourceId,
  );
  const globalAllowed = await checkPermission(
    userId,
    PermissionValues.MANAGE_ROLES,
  );
  if (!allowed && !globalAllowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  let permissions = await services.permission!.getPermissionsForResource(resourceType, resourceId);
  if (query.userId) {
    permissions = permissions.filter((p) => p.userId === query.userId);
  }
  if (query.permission) {
    permissions = permissions.filter((p) => p.permission === query.permission);
  }
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
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
}

export const GET = (
  req: NextRequest,
  ctx: { params: { type: string; id: string } },
) =>
  createApiHandler(
    querySchema,
    (r, auth, data, services) =>
      handleGet(r, auth, data, services, ctx.params.type, ctx.params.id),
    { requireAuth: true },
  )(req);
