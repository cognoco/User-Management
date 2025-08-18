import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/common';
import { EmailVerificationService } from '@/services/auth/email-verification.service';
import { logUserAction } from '@/lib/audit/auditLogger';

// Zod schema for resend verification
const ResendVerificationSchema = z.object({
  email: z.string().email('Invalid email address')
});

/**
 * POST handler for resending verification email
 */
export const POST = withValidatedServices({
  schema: ResendVerificationSchema,
  requiredServices: ['auth'],
  requireAuth: false,
  handler: async ({ request, data, services }) => {
    const { email } = data;
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    try {
      // Create email verification service instance
      const emailVerificationService = new EmailVerificationService(
        services.auth.provider,
        process.env.NODE_ENV === 'production'
      );

      // Resend verification email
      const result = await emailVerificationService.resendVerification(
        email,
        ipAddress,
        userAgent
      );

      if (result.success) {
        await logUserAction({
          action: 'EMAIL_VERIFICATION_RESEND',
          status: 'SUCCESS',
          ipAddress,
          userAgent,
          targetResourceType: 'auth',
          targetResourceId: email
        });

        return createSuccessResponse({
          success: true,
          message: result.message || 'Verification email resent successfully',
          remainingResends: result.remainingResends
        });
      } else {
        await logUserAction({
          action: 'EMAIL_VERIFICATION_RESEND',
          status: 'FAILURE',
          ipAddress,
          userAgent,
          targetResourceType: 'auth',
          targetResourceId: email,
          details: { error: result.error }
        });

        // Check if it's a rate limit error
        if (result.nextResendAt) {
          return createErrorResponse({
            success: false,
            error: result.error || 'Please wait before requesting another email',
            nextResendAt: result.nextResendAt,
            remainingResends: result.remainingResends
          }, 429); // Too Many Requests
        }

        return createErrorResponse({
          success: false,
          error: result.error || 'Failed to resend verification email'
        }, 400);
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      
      await logUserAction({
        action: 'EMAIL_VERIFICATION_RESEND',
        status: 'FAILURE',
        ipAddress,
        userAgent,
        targetResourceType: 'auth',
        targetResourceId: email,
        details: { error: error?.message || 'Internal error' }
      });

      return createErrorResponse({
        success: false,
        error: 'An error occurred while resending verification email'
      }, 500);
    }
  }
});