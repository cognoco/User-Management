export const runtime = 'nodejs';
import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createNoContentResponse } from '@/lib/api/common';


export const POST = withValidatedServices({
  schema: z.object({}),
  requiredServices: ['address'],
  requireAuth: true,
  handler: async ({ services, params, userId }) => {
    const id = params.id;
    await services.address.setDefaultAddress(id, userId!);
    return createNoContentResponse();
  }
});
