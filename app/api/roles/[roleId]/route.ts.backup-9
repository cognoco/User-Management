import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { createSuccessResponse, createNoContentResponse } from '@/lib/api/common';
import { createApiHandler } from '@/lib/api/route-helpers';
import { mapPermissionServiceError, createRoleNotFoundError } from '@/lib/api/permission/error-handler';
import { PermissionValues } from '@/core/permission/models';

const updateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

type UpdateRole = z.infer<typeof updateSchema>;

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
  const id = getRoleId(req);
  const role = await services.permission.getRoleById(id);
  if (!role) {
    throw createRoleNotFoundError(id);
  }
  return createSuccessResponse({ role });
}

async function handlePatch(
  req: NextRequest,
  auth: any,
  data: UpdateRole,
  services: any,
) {
  const id = getRoleId(req);
  try {
    const role = await services.permission.updateRole(id, data, auth.userId);
    return createSuccessResponse({ role });
  } catch (e) {
    throw mapPermissionServiceError(e as Error);
  }
}

async function handlePut(
  req: NextRequest,
  auth: any,
  data: UpdateRole,
  services: any,
) {
  const id = getRoleId(req);
  try {
    const role = await services.permission.updateRole(id, data, auth.userId);
    return createSuccessResponse({ role });
  } catch (e) {
    throw mapPermissionServiceError(e as Error);
  }
}

async function handleDelete(
  req: NextRequest,
  auth: any,
  _data: unknown,
  services: any,
) {
  const id = getRoleId(req);
  const ok = await services.permission.deleteRole(id, auth.userId);
  if (!ok) {
    throw createRoleNotFoundError(id);
  }
  return createNoContentResponse();
}

export const GET = createApiHandler(z.object({}), handleGet, {
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
});

export const PATCH = createApiHandler(updateSchema, handlePatch, {
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
});

export const PUT = createApiHandler(updateSchema, handlePut, {
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
});

export const DELETE = createApiHandler(z.object({}), handleDelete, {
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
});
