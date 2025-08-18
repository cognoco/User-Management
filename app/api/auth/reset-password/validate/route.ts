import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/common';
import { PasswordResetService } from '@/services/auth/password-reset.service';

// Zod schema for token validation
const TokenValidationSchema = z.object({
  token: z.string().min(1, 'Token is required')
});

/**
 * POST handler for password reset token validation
 */
export const POST = withValidatedServices({
  schema: TokenValidationSchema,
  requiredServices: ['auth'],
  requireAuth: false,
  handler: async ({ data, services }) => {
    const { token } = data;

    try {
      // Create password reset service instance
      const passwordResetService = new PasswordResetService(
        services.auth.provider,
        process.env.NODE_ENV === 'production'
      );

      // Validate the token
      const result = await passwordResetService.validateToken(token);

      if (result.valid) {
        return createSuccessResponse({
          valid: true,
          email: result.email, // Only return email if token is valid
          remainingTime: result.remainingTime
        });
      } else {
        return createErrorResponse({
          valid: false,
          error: result.error || 'Invalid or expired token'
        }, 400);
      }
    } catch (error) {
      console.error('Token validation error:', error);
      return createErrorResponse({
        valid: false,
        error: 'Failed to validate token'
      }, 500);
    }
  }
});