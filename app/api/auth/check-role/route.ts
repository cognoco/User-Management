import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';

const CheckRoleSchema = z.object({
  role: z.string().min(1),
  includeHierarchy: z.boolean().optional()
});

export const POST = withValidatedServices({
  schema: CheckRoleSchema,
  requiredServices: ['permission'],
  requireAuth: true,
  handler: async ({ services, data, userId }) => {
    if (!userId) {
      return createSuccessResponse({ hasRole: false });
    }
    const hasRole = await services.permission.hasRole(userId, data.role as any);
    return createSuccessResponse({ hasRole, effectiveRole: hasRole ? data.role : undefined });
  }
});
