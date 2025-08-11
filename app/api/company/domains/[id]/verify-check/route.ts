import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { checkRateLimit } from '@/middleware/rate-limit';
import { logUserAction } from '@/lib/audit/auditLogger';
import { ApiError, ERROR_CODES, createSuccessResponse } from '@/lib/api/common';

export const POST = withValidatedServices({
  schema: z.object({}),
  requiredServices: ['company'],
  requireAuth: true,
  handler: async ({ request, params, auth, services }) => {
    if (await checkRateLimit(request, { windowMs: 15 * 60 * 1000, max: 10 })) {
      throw new ApiError(ERROR_CODES.OPERATION_FAILED, 'Too many requests', 429);
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    try {
      const result = await services.company.checkDomainVerification(params.id, auth.userId!);

      await logUserAction({
        userId: auth.userId,
        action: 'DOMAIN_VERIFICATION_CHECK',
        status: result.verified ? 'SUCCESS' : 'FAILURE',
        ipAddress,
        userAgent,
        targetResourceType: 'company',
        targetResourceId: params.id,
      });

      return createSuccessResponse({ verified: result.verified, message: result.message }, result.verified ? 200 : 400);
    } catch (error: any) {
      await logUserAction({
        userId: auth.userId,
        action: 'DOMAIN_VERIFICATION_CHECK_FAILED',
        status: 'FAILURE',
        ipAddress,
        userAgent,
        targetResourceType: 'company',
        targetResourceId: params.id,
        details: { error: error?.message }
      });

      const message = error?.message || 'Domain verification failed';
      if (/not found/i.test(message)) {
        throw new ApiError(ERROR_CODES.NOT_FOUND, message, 404);
      }
      if (/initiated/i.test(message)) {
        throw new ApiError(ERROR_CODES.INVALID_REQUEST, message, 400);
      }
      throw new ApiError(ERROR_CODES.INTERNAL_ERROR, message, 500);
    }
  },
});
