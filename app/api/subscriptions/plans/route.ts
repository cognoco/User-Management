import { withValidatedServices, schemas } from '@/src/lib/api/with-services';
import {
  createSuccessResponse,
  ApiError,
  ERROR_CODES,
} from '@/lib/api/common';
import { checkRateLimit } from '@/middleware/rate-limit';

/**
 * Public endpoint to list available subscription plans.
 */
const getHandler = async ({ request, services }: { request: any, services: any }) => {
  const isRateLimited = await checkRateLimit(request);
  if (isRateLimited) {
    throw new ApiError(ERROR_CODES.INVALID_REQUEST, 'Too many requests', 429);
  }
  const plans = await services.subscription.getAvailablePlans();
  return createSuccessResponse({ plans });
};

export const GET = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['subscription'],
  requireAuth: false,
  handler: getHandler
});
