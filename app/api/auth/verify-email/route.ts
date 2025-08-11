import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { logUserAction } from '@/lib/audit/auditLogger';
import {
  createSuccessResponse,
  ApiError,
  ERROR_CODES
} from '@/lib/api/common';

const VerifyEmailSchema = z.object({ token: z.string().min(1) });

/**
 * POST handler for email verification endpoint
 */
export const POST = withValidatedServices({
  schema: VerifyEmailSchema,
  requiredServices: ['auth'],
  requireAuth: false, // Email verification doesn't require auth
  handler: async ({ request, data, services }) => {
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    try {
      await services.auth.verifyEmail(data.token);
      
      await logUserAction({
        action: 'EMAIL_VERIFIED',
        status: 'SUCCESS',
        ipAddress,
        userAgent,
        targetResourceType: 'auth'
      });
      
      return createSuccessResponse({ message: 'Email verified successfully' });
    } catch (error) {
      await logUserAction({
        action: 'EMAIL_VERIFICATION_FAILED',
        status: 'FAILURE',
        ipAddress,
        userAgent,
        targetResourceType: 'auth',
        details: { error: error instanceof Error ? error.message : String(error) }
      });
      
      throw new ApiError(
        ERROR_CODES.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Verification failed',
        500
      );
    }
  },
});
