import { withValidatedServices, schemas } from '@/src/lib/api/with-services';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';

/**
 * POST handler for MFA enable endpoint
 */
const postHandler = async ({ services }: { services: any }) => {
  const result = await services.auth.setupMFA();
  
  if (!result.success) {
    throw new ApiError(ERROR_CODES.INVALID_REQUEST, result.error || 'MFA setup failed', 400);
  }
  
  return createSuccessResponse(result);
};

export const POST = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['auth'],
  requireAuth: true,
  handler: postHandler
});
