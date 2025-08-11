import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';

export const DELETE = withValidatedServices({
  schema: z.object({}),
  requiredServices: ['companyNotification'],
  requireAuth: true,
  handler: async ({ auth, params, services }) => {
    await services.companyNotification.removeRecipient(auth.userId!, params.id);
    return createSuccessResponse({ success: true, message: 'Recipient removed successfully' });
  },
});
