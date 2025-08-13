import { z } from 'zod';
import {
  createSuccessResponse,
  createCreatedResponse,
} from '@/lib/api/common';
import { withValidatedServices } from '@/lib/api/with-services';
import { mapPermissionServiceError } from '@/lib/api/permission/error-handler';
import { PermissionValues } from '@/core/permission/models';

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissions: z.array(z.string()).default([]),
});

type CreateRole = z.infer<typeof createSchema>;

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const getHandler = async ({ data, services }: { data: z.infer<typeof querySchema>, services: any }) => {
  const roles = await services.permission.getAllRoles();
  const start = (data.page - 1) * data.limit;
  const paginated = roles.slice(start, start + data.limit);
  return createSuccessResponse({
    roles: paginated,
    page: data.page,
    limit: data.limit,
    total: roles.length,
  });
};

const postHandler = async ({ data, userId, services }: { data: CreateRole, userId?: string, services: any }) => {
  try {
    const role = await services.permission.createRole(data, userId!);
    return createCreatedResponse({ role });
  } catch (e) {
    throw mapPermissionServiceError(e as Error);
  }
};

export const GET = withValidatedServices({
  schema: querySchema,
  requiredServices: ['permission'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
  handler: getHandler
});

export const POST = withValidatedServices({
  schema: createSchema,
  requiredServices: ['permission'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
  handler: postHandler
});
