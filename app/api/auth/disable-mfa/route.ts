import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { logUserAction } from '@/lib/audit/auditLogger';
import {
  createSuccessResponse,
  ApiError,
  ERROR_CODES
} from '@/lib/api/common';

const DisableMfaSchema = z.object({ code: z.string().min(4) });

/**
 * POST handler for MFA disable endpoint
 */
export const POST = withValidatedServices({
  schema: DisableMfaSchema,
  requiredServices: ['auth'],
  requireAuth: true,
  rateLimit: { windowMs: 15 * 60 * 1000, max: 5 },
  handler: async ({ services, request, data, userId }) => {
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    const result = await services.auth.disableMFA(data.code);

    await logUserAction({
      userId: userId,
      action: 'MFA_DISABLE',
      status: result.success ? 'SUCCESS' : 'FAILURE',
      ipAddress,
      userAgent,
      targetResourceType: 'auth',
      targetResourceId: userId
    });

    if (!result.success) {
      throw new ApiError(
        ERROR_CODES.INVALID_REQUEST,
        result.error || 'MFA disable failed',
        400
      );
    }

    return createSuccessResponse(result);
  }
});
