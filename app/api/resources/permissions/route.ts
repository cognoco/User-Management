// POST /api/resources/permissions - Assign permission to user for specific resource
// DELETE /api/resources/permissions - Remove permission from user for specific resource

import { z } from 'zod';
import {
  createCreatedResponse,
  createNoContentResponse,
  ApiError,
  ERROR_CODES,
} from '@/lib/api/common';
import { withValidatedServices, type WithServicesContext } from '@/lib/api/with-services';
import {
  PermissionValues,
  PermissionSchema,
} from '@/core/permission/models';

import { checkPermission } from '@/lib/auth/permissionCheck';
import { mapPermissionServiceError } from '@/src/lib/api/permission/error-handler';

const assignSchema = z.object({
  userId: z.string(),
  permission: PermissionSchema,
  resourceType: z.string(),
  resourceId: z.string(),
});
type AssignPayload = z.infer<typeof assignSchema>;

// DELETE schema for query parameters
const deleteSchema = z.object({
  userId: z.string(),
  permission: PermissionSchema,
  resourceType: z.string(),
  resourceId: z.string(),
});

/**
 * Handle POST request - Assign permission to user for specific resource
 */
async function handlePost(context: WithServicesContext<AssignPayload>) {
  const { data, userId, services } = context;
  
  // Check permissions - either resource-specific or global MANAGE_ROLES
  const allowed =
    (await checkPermission(
      userId!,
      PermissionValues.MANAGE_ROLES,
      data.resourceType,
      data.resourceId,
    )) || (await checkPermission(userId!, PermissionValues.MANAGE_ROLES));
    
  if (!allowed) {
    throw new ApiError(
      ERROR_CODES.FORBIDDEN,
      'Insufficient permissions to manage resource permissions',
      403
    );
  }
  
  try {
    const permission = await services.permission.assignResourcePermission(
      data.userId,
      data.permission,
      data.resourceType,
      data.resourceId,
      userId!,
    );
    return createCreatedResponse({ permission });
  } catch (error) {
    throw mapPermissionServiceError(error as Error);
  }
}

/**
 * Handle DELETE request - Remove permission from user for specific resource
 */
async function handleDelete(context: WithServicesContext<z.infer<typeof deleteSchema>>) {
  const { data, userId, services } = context;
  
  // Check permissions - either resource-specific or global MANAGE_ROLES
  const allowed =
    (await checkPermission(
      userId!,
      PermissionValues.MANAGE_ROLES,
      data.resourceType,
      data.resourceId,
    )) || (await checkPermission(userId!, PermissionValues.MANAGE_ROLES));
    
  if (!allowed) {
    throw new ApiError(
      ERROR_CODES.FORBIDDEN,
      'Insufficient permissions to manage resource permissions',
      403
    );
  }
  
  try {
    const success = await services.permission.removeResourcePermission(
      data.userId,
      data.permission,
      data.resourceType,
      data.resourceId,
      userId!,
    );
    
    console.log(
      `[resource-permissions] removed ${data.permission} for ${data.userId} on ${data.resourceType}:${data.resourceId}`,
    );
    
    if (!success) {
      throw mapPermissionServiceError(new Error('Permission removal failed'));
    }
    
    return createNoContentResponse();
  } catch (error) {
    throw mapPermissionServiceError(error as Error);
  }
}

/**
 * POST /api/resources/permissions
 * Assigns a permission to a user for a specific resource
 */
export const POST = withValidatedServices<AssignPayload>({
  schema: assignSchema,
  requiredServices: ['permission'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
  handler: handlePost,
});

/**
 * DELETE /api/resources/permissions
 * Removes a permission from a user for a specific resource
 * Parameters passed as query string
 */
export const DELETE = withValidatedServices<z.infer<typeof deleteSchema>>({
  schema: deleteSchema,
  requiredServices: ['permission'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.MANAGE_ROLES],
  handler: handleDelete,
});
