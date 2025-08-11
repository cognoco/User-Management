import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withValidatedServices } from '@/src/lib/api/with-services';
import {
  createSuccessResponse,
  ApiError,
  ERROR_CODES,
} from '@/lib/api/common';
import { checkRateLimit } from '@/middleware/rate-limit';
import { logUserAction } from '@/lib/audit/auditLogger';

const bodySchema = z.object({
  subscriptionId: z.string(),
  immediate: z.boolean().optional(),
});

/**
 * Cancel a user's subscription.
 */
const postHandler = async ({ request, data, userId, services }: { request: any, data: z.infer<typeof bodySchema>, userId?: string, services: any }) => {
  const isRateLimited = await checkRateLimit(request);
  if (isRateLimited) {
    throw new ApiError(ERROR_CODES.INVALID_REQUEST, 'Too many requests', 429);
  }

  const result = await services.subscription.cancelSubscription(
    data.subscriptionId,
    data.immediate
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Failed to cancel' }, { status: 400 });
  }
  await logUserAction({
    userId: userId!,
    action: 'SUBSCRIPTION_CANCELLED',
    status: 'SUCCESS',
    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    targetResourceType: 'subscription',
    targetResourceId: data.subscriptionId,
  });
  return createSuccessResponse({ success: true });
};

export const POST = withValidatedServices({
  schema: bodySchema,
  requiredServices: ['subscription'],
  requireAuth: true,
  handler: postHandler
});
