import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { createSuccessResponse, createNoContentResponse } from '@/lib/api/common';
import { createApiHandler } from '@/lib/api/route-helpers';
import { mapPermissionServiceError } from '@/lib/api/permission/error-handler';
import { PermissionValues } from '@/core/permission/models';

const modifySchema = z.object({
  permission: z.string(),
});

type Modify = z.infer<typeof modifySchema>;

function getRoleId(req: NextRequest): string {
  const url = new URL(req.url);
  return url.pathname.split('/')[3];
}

async function handleGet(
  req: NextRequest,
  _auth: any,
  _data: unknown,
  services: any,
) {
  const roleId = getRoleId(req);
  const permissions = await services.permission.getRolePermissions(roleId);
  return createSuccessResponse({ permissions });
}

async function handlePost(
  req: NextRequest,
  _auth: any,
  data: Modify,
  services: any,
) {
  const roleId = getRoleId(req);
  try {
    const permission = await services.permission.addPermissionToRole(
      roleId,
      data.permission,
    );
    return createSuccessResponse({ permission });
  } catch (e) {
    throw mapPermissionServiceError(e as Error);
  }
}

async function handleDelete(
  req: NextRequest,
  _auth: any,
  data: Modify,
  services: any,
) {
  const roleId = getRoleId(req);
  try {
    await services.permission.removePermissionFromRole(roleId, data.permission);
    return createNoContentResponse();
  } catch (e) {
    throw mapPermissionServiceError(e as Error);
  }
}

export const GET = createApiHandler(z.object({}), handleGet, {
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
});

export const POST = createApiHandler(modifySchema, handlePost, {
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
});

export const DELETE = createApiHandler(modifySchema, handleDelete, {
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
});
