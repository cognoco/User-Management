import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';
import { permissionCheckCache } from '@/lib/auth/permission-cache';

const CheckPermissionSchema = z.object({
  permission: z.string().min(1),
  resourceType: z.string().optional(),
  resourceId: z.string().optional()
});

async function handleCheckPermission({ userId, data, services }: { userId?: string, data: z.infer<typeof CheckPermissionSchema>, services: any }) {
  if (!userId) {
    return createSuccessResponse({ hasPermission: false });
  }

  const key = `${userId}:${data.permission}:${data.resourceType ?? ''}:${
    data.resourceId ?? ''}`;

  const allowed = await permissionCheckCache.getOrCreate(key, () =>
    services.permission.hasPermission(userId, data.permission as any)
  );

  return createSuccessResponse({ hasPermission: allowed });
}

export const POST = withValidatedServices({
  schema: CheckPermissionSchema,
  requiredServices: ['permission'],
  requireAuth: true,
  handler: handleCheckPermission
});
