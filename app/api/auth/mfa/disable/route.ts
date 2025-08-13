import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';

const DisableSchema = z.object({ code: z.string().min(4) });

/**
 * POST handler for MFA disable endpoint
 */
const postHandler = async ({ data, services }: { data: z.infer<typeof DisableSchema>, services: any }) => {
  const result = await services.auth.disableMFA(data.code);
  
  if (!result.success) {
    throw new ApiError(ERROR_CODES.INVALID_REQUEST, result.error || 'MFA disable failed', 400);
  }
  
  return createSuccessResponse(result);
};

export const POST = withValidatedServices({
  schema: DisableSchema,
  requiredServices: ['auth'],
  requireAuth: true,
  handler: postHandler
});
