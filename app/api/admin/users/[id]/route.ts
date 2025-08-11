import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withValidatedServices, schemas } from '@/lib/api/with-services';
import { createSuccessResponse, createNoContentResponse } from '@/lib/api/common';
import { PermissionValues } from '@/core/permission/models';
import { createUserNotFoundError } from '@/lib/api/admin/error-handler';
import { notifyUserChanges } from '@/lib/realtime/notifyUserChanges';

const updateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  role: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

function extractUserIdFromPath(pathname: string): string {
  const pathParts = pathname.split('/');
  const userId = pathParts[pathParts.length - 1];
  if (!userId || userId === '') {
    throw new Error('User ID is required');
  }
  return userId;
}

export const GET = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['admin'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.ADMIN_ACCESS],
  handler: async ({ request, services }) => {
    const userId = extractUserIdFromPath(request.url);
    
    const user = await services.admin.getUserById(userId);
    if (!user) {
      throw createUserNotFoundError(userId);
    }
    return createSuccessResponse({ user });
  }
});

export const PUT = withValidatedServices({
  schema: updateUserSchema,
  requiredServices: ['admin'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.ADMIN_ACCESS],
  handler: async ({ request, data, services }) => {
    const userId = extractUserIdFromPath(request.url);
    
    const existingUser = await services.admin.getUserById(userId);
    if (!existingUser) {
      throw createUserNotFoundError(userId);
    }
    const updated = await services.admin.updateUser(userId, data);
    await notifyUserChanges('UPDATE', userId, updated, existingUser);
    return createSuccessResponse({ user: updated });
  }
});

export const DELETE = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['admin'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.ADMIN_ACCESS],
  handler: async ({ request, services }) => {
    const userId = extractUserIdFromPath(request.url);
    
    const existingUser = await services.admin.getUserById(userId);
    if (!existingUser) {
      throw createUserNotFoundError(userId);
    }
    await services.admin.deleteUser(userId);
    await notifyUserChanges('DELETE', userId, null, existingUser);
    return createNoContentResponse();
  }
});
