import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { createSuccessResponse } from '@/lib/api/common';
import { createApiHandler } from '@/lib/api/route-helpers';
import { PermissionValues } from '@/core/permission/models';
import type { AuthContext, ServiceContainer } from '@/core/config/interfaces';

// GET /api/users/[id]/permissions/resources - Get resource permissions for a user

const querySchema = z.object({
  resourceType: z.string().optional(),
  sortBy: z.enum(['created', 'type']).optional().default('created'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
});
type Query = z.infer<typeof querySchema>;

async function handleGet(
  _req: NextRequest,
  _auth: AuthContext,
  query: Query,
  services: ServiceContainer,
  userId: string,
) {
  let permissions = await services.permission!.getUserResourcePermissions(userId);
  if (query.resourceType) {
    permissions = permissions.filter((p) => p.resourceType === query.resourceType);
  }
  if (query.sortBy === 'type') {
    permissions.sort((a, b) => a.resourceType.localeCompare(b.resourceType));
  } else {
    permissions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  if (query.order === 'desc') {
    permissions.reverse();
  }
  return createSuccessResponse({ permissions });
}

export const GET = (
  req: NextRequest,
  ctx: { params: { id: string } },
) =>
  createApiHandler(
    querySchema,
    (r, auth, data, services) => handleGet(r, auth, data, services, ctx.params.id),
    { requireAuth: true, requiredPermissions: [PermissionValues.MANAGE_ROLES] },
  )(req);
