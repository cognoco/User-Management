import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';

const updateSchema = z.object({
  enabled: z.boolean().optional(),
  channel: z.enum(['email', 'in_app', 'both']).optional(),
});

export const PATCH = withValidatedServices({
  schema: updateSchema,
  requiredServices: ['companyNotification'],
  requireAuth: true,
  handler: async ({ auth, data, params, services }) => {
    const updated = await services.companyNotification.updatePreference(auth.userId!, params.id, data);
    return createSuccessResponse(updated);
  },
});
