import { withValidatedServices, schemas } from '@/src/lib/api/with-services';
import {
  createSuccessResponse,
  ApiError,
  ERROR_CODES,
} from '@/lib/api/common';
import { checkRateLimit } from '@/middleware/rate-limit';
import { logUserAction } from '@/lib/audit/auditLogger';

/**
 * Retrieve the current user's subscription status.
 */
const getHandler = async ({ request, userId, services }: { request: any, userId?: string, services: any }) => {
  const isRateLimited = await checkRateLimit(request);
  if (isRateLimited) {
    throw new ApiError(ERROR_CODES.INVALID_REQUEST, 'Too many requests', 429);
  }
  const subscription = await services.subscription.getUserSubscription(userId!);
  await logUserAction({
    userId: userId!,
    action: 'SUBSCRIPTION_STATUS_VIEWED',
    status: 'SUCCESS',
    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    targetResourceType: 'subscription',
  });
  return createSuccessResponse({ subscription: subscription ?? null });
};

export const GET = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['subscription'],
  requireAuth: true,
  handler: getHandler
});
