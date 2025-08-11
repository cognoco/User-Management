import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';
import { permissionCheckCache } from '@/lib/auth/permission-cache';

const CheckSchema = z.object({
  permission: z.string().min(1),
  resourceType: z.string().optional(),
  resourceId: z.string().optional()
});

const BatchSchema = z.object({
  checks: z.array(CheckSchema).min(1)
});

async function handleCheckPermissions({ userId, data, services }: { userId?: string, data: z.infer<typeof BatchSchema>, services: any }) {
  if (!userId) {
    return createSuccessResponse({
      results: data.checks.map((c) => ({ permission: c.permission, hasPermission: false })),
    });
  }

  const results = await Promise.all(
    data.checks.map(async (c) => {
      const key = `${userId}:${c.permission}:${c.resourceType ?? ''}:${c.resourceId ?? ''}`;
      const allowed = await permissionCheckCache.getOrCreate(key, () =>
        services.permission.hasPermission(userId, c.permission as any)
      );
      return { permission: c.permission, hasPermission: allowed };
    })
  );

  return createSuccessResponse({ results });
}

export const POST = withValidatedServices({
  schema: BatchSchema,
  requiredServices: ['permission'],
  requireAuth: true,
  handler: handleCheckPermissions
});
