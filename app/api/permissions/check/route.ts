import { z } from 'zod';

import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';
import {
  createPermissionNotFoundError,
  mapPermissionServiceError,
} from '@/lib/api/permission/error-handler';
import { isPermission, Permission } from '@/lib/rbac/roles';

const querySchema = z.object({
  permission: z.string().min(1),
  resource: z.string().optional(),
  resourceId: z.string().optional(),
});

const batchSchema = z.object({
  checks: z.array(querySchema).min(1),
});

type QueryParams = z.infer<typeof querySchema>;

async function handlePermissionCheck(
  userId: string,
  user: any,
  services: any,
  data: QueryParams,
) {
  const { permission, resource, resourceId } = data;

  if (!isPermission(permission)) {
    throw createPermissionNotFoundError(permission);
  }

  try {
    let allowed = false;
    if (resource && resourceId) {
      allowed = await services.permission.hasResourcePermission(
        userId,
        permission as Permission,
        resource,
        resourceId,
      );
    } else {
      const metadataPerms: string[] =
        (user?.app_metadata as any)?.permissions ?? [];
      allowed = metadataPerms.includes(permission);
      if (!allowed) {
        allowed = await services.permission.hasPermission(userId, permission as Permission);
      }
    }
    return { allowed };
  } catch (error) {
    throw mapPermissionServiceError(error as Error);
  }
}

const getHandler = async ({ data, userId, user, services }: { data: QueryParams, userId?: string, user?: any, services: any }) => {
  const result = await handlePermissionCheck(userId!, user, services, data);
  return createSuccessResponse(result);
};

const postHandler = async ({ data, userId, user, services }: { data: z.infer<typeof batchSchema>, userId?: string, user?: any, services: any }) => {
  const results = await Promise.all(
    data.checks.map(async (c) => {
      const response = await handlePermissionCheck(userId!, user, services, c);
      return response.allowed;
    }),
  );
  const formatted = data.checks.map((c, idx) => ({ ...c, allowed: results[idx] }));
  return createSuccessResponse({ results: formatted });
};

export const GET = withValidatedServices({
  schema: querySchema,
  requiredServices: ['permission'],
  requireAuth: true,
  includeUser: true,
  handler: getHandler
});

export const POST = withValidatedServices({
  schema: batchSchema,
  requiredServices: ['permission'],
  requireAuth: true,
  includeUser: true,
  handler: postHandler
});
