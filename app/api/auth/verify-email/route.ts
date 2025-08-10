import { z } from 'zod';
import { createApiHandlerWithServices } from '@/lib/api/route-helpers-v2';
import { configureUserManagement } from '@/lib/config/configure-user-management';
import { logUserAction } from '@/lib/audit/auditLogger';
import {
  createSuccessResponse,
  ApiError,
  ERROR_CODES
} from '@/lib/api/common';

// Configure services at module level using dependency injection
const services = configureUserManagement();

const VerifyEmailSchema = z.object({ token: z.string().min(1) });

/**
 * POST handler for email verification endpoint
 */
export const POST = createApiHandlerWithServices(
  VerifyEmailSchema,
  async (request, _authContext, data, injectedServices) => {
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    try {
      await injectedServices.auth.verifyEmail(data.token);
      
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
  services,
  { 
    requireAuth: false, // Email verification doesn't require auth
    rateLimit: { windowMs: 15 * 60 * 1000, max: 30 }
  }
);
