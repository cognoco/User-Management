import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';
import { PermissionValues } from '@/core/permission/models';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  userId: z.string().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const GET = withValidatedServices({
  schema: querySchema,
  requiredServices: ['admin'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.ADMIN_ACCESS], // Using generic admin permission for now
  handler: async ({ data, services }) => {
    const result = await services.admin.getAuditLogs(data);
    return createSuccessResponse({ logs: result.logs, pagination: result.pagination });
  }
});
