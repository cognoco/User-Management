import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/common';
import { PasswordResetService } from '@/services/auth/password-reset.service';
import { logUserAction } from '@/lib/audit/auditLogger';

// Zod schema for password reset confirmation
const PasswordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  confirmPassword: z.string().optional()
}).refine(data => !data.confirmPassword || data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

/**
 * POST handler for password reset confirmation
 */
export const POST = withValidatedServices({
  schema: PasswordResetConfirmSchema,
  requiredServices: ['auth'],
  requireAuth: false,
  handler: async ({ request, data, services }) => {
    const { token, password, confirmPassword } = data;
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    try {
      // Create password reset service instance
      const passwordResetService = new PasswordResetService(
        services.auth.provider,
        process.env.NODE_ENV === 'production'
      );

      // Reset the password
      const result = await passwordResetService.resetPasswordWithToken(
        token,
        password,
        confirmPassword
      );

      if (result.success) {
        // Log successful password reset
        await logUserAction({
          action: 'PASSWORD_RESET_COMPLETED',
          status: 'SUCCESS',
          ipAddress,
          userAgent,
          targetResourceType: 'auth',
          details: { tokenUsed: true }
        });

        return createSuccessResponse({
          success: true,
          message: result.message || 'Password has been reset successfully'
        });
      } else {
        // Log failed attempt
        await logUserAction({
          action: 'PASSWORD_RESET_COMPLETED',
          status: 'FAILURE',
          ipAddress,
          userAgent,
          targetResourceType: 'auth',
          details: { error: result.error }
        });

        return createErrorResponse({
          success: false,
          error: result.error || 'Failed to reset password'
        }, 400);
      }
    } catch (error) {
      console.error('Password reset confirmation error:', error);
      
      await logUserAction({
        action: 'PASSWORD_RESET_COMPLETED',
        status: 'FAILURE',
        ipAddress,
        userAgent,
        targetResourceType: 'auth',
        details: { error: error?.message || 'Internal error' }
      });

      return createErrorResponse({
        success: false,
        error: 'An error occurred while resetting your password'
      }, 500);
    }
  }
});