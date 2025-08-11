import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import {
  createSuccessResponse,
  ApiError,
  ERROR_CODES,
} from '@/lib/api/common';

const VerifyTokenSchema = z.object({ 
  token: z.string().min(1, 'Token is required') 
});

/**
 * POST handler for verifying password reset token endpoint
 * Migrated to use withValidatedServices pattern for better dependency management.
 */
export const POST = withValidatedServices({
  schema: VerifyTokenSchema,
  requiredServices: ['auth'],
  requireAuth: false, // Token verification doesn't require auth
  handler: async ({ request, data, services }) => {
    // Extract request context for the service
    const context = {
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    };
    
    // Call auth service with context - all business logic including audit logging is now in the service
    const result = await services.auth.verifyPasswordResetToken(data.token, context);
    
    if (!result.valid) {
      throw new ApiError(
        ERROR_CODES.INVALID_REQUEST, 
        result.error || 'Invalid or expired token', 
        400
      );
    }
    
    return createSuccessResponse({ 
      message: 'Token valid',
      userId: result.userId // Include user ID if available for the reset process
    });
  }
});
