// POST /api/resources/permissions - Assign permission to user for specific resource
// DELETE /api/resources/permissions - Remove permission from user for specific resource

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  createCreatedResponse,
  createNoContentResponse,
} from '@/lib/api/common';
import { createApiHandler } from '@/lib/api/route-helpers';
import {
  PermissionValues,
  PermissionSchema,
} from '@/core/permission/models';

import { checkPermission } from '@/lib/auth/permissionCheck';
import { mapPermissionServiceError } from '@/lib/api/permission/error-handler';

const assignSchema = z.object({
  userId: z.string(),
  permission: PermissionSchema,
  resourceType: z.string(),
  resourceId: z.string(),
});
type AssignPayload = z.infer<typeof assignSchema>;

const removeSchema = assignSchema;

async function handlePost(
  _req: NextRequest,
  userId: string,
  data: AssignPayload,
  services: any,
) {
  const allowed =
    (await checkPermission(
      userId,
      PermissionValues.MANAGE_ROLES,
      data.resourceType,
      data.resourceId,
    )) || (await checkPermission(userId, PermissionValues.MANAGE_ROLES));
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const permission = await services.permission.assignResourcePermission(
      data.userId,
      data.permission,
      data.resourceType,
      data.resourceId,
      userId,
    );
    return createCreatedResponse({ permission });
  } catch (e) {
    throw mapPermissionServiceError(e as Error);
  }
}

async function handleDelete(
  userId: string,
  data: AssignPayload,
  services: any,
) {
  const allowed =
    (await checkPermission(
      userId,
      PermissionValues.MANAGE_ROLES,
      data.resourceType,
      data.resourceId,
    )) || (await checkPermission(userId, PermissionValues.MANAGE_ROLES));
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const ok = await services.permission.removeResourcePermission(
    data.userId,
    data.permission,
    data.resourceType,
    data.resourceId,
    userId,
  );
  console.log(
    `[resource-permissions] removed ${data.permission} for ${data.userId} on ${data.resourceType}:${data.resourceId}`,
  );
  if (!ok) {
    throw mapPermissionServiceError(new Error('delete failed'));
  }
  return createNoContentResponse();
}

export const POST = createApiHandler(assignSchema, async (req, auth, data, services) =>
  handlePost(req, auth.userId!, data, services), {
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
});

export const DELETE = createApiHandler(z.object({}), async (req, auth, _d, services) => {
  const params = Object.fromEntries(new URL(req.url).searchParams.entries());
  const data = removeSchema.parse(params);
  return handleDelete(auth.userId!, data, services);
}, {
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
});
