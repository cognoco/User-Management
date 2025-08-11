import { z } from 'zod';
import { TwoFactorMethod } from '@/types/2fa';
import { withValidatedServices } from '@/lib/api/with-services';
import { logUserAction } from '@/lib/audit/auditLogger';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';

// Request schema for MFA check after initial login
const mfaCheckSchema = z.object({
  accessToken: z.string(), // Temporary access token from initial login
  preferredMethod: z.nativeEnum(TwoFactorMethod).optional(), // Optional preferred MFA method
});

/**
 * POST handler for MFA check endpoint
 */
export const POST = withValidatedServices({
  schema: mfaCheckSchema,
  requiredServices: ['auth'],
  requireAuth: false, // MFA check doesn't require full auth
  rateLimit: { windowMs: 15 * 60 * 1000, max: 10 },
  handler: async ({ services, request, data }) => {
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    try {
      const { accessToken, preferredMethod } = data;
      
      // Check MFA requirements and send verification code if needed
      const result = await services.auth.checkMfaRequirements({
        accessToken,
        preferredMethod
      });
      
      // Log the MFA check
      await logUserAction({
        action: 'MFA_CHECK',
        status: 'SUCCESS',
        ipAddress,
        userAgent,
        targetResourceType: 'auth',
        details: { 
          mfaRequired: result.mfaRequired,
          selectedMethod: result.selectedMethod
        }
      });
      
      // If there was an error, return it
      if (!result.success) {
        console.error('MFA check failed:', result.error);
        throw new ApiError(
          ERROR_CODES.INVALID_REQUEST,
          result.error || 'MFA check failed',
          400
        );
      }

      // Return MFA check response
      return createSuccessResponse({
        mfaRequired: result.mfaRequired,
        availableMethods: result.availableMethods || [],
        selectedMethod: result.selectedMethod,
        accessToken: result.accessToken,
        user: result.user
      });
    } catch (error) {
      console.error('Error in MFA check:', error);
      
      // Log the error
      await logUserAction({
        action: 'MFA_CHECK_ERROR',
        status: 'FAILURE',
        ipAddress,
        userAgent,
        targetResourceType: 'auth',
        details: { error: error instanceof Error ? error.message : 'An unexpected error occurred' }
      });
      
      throw new ApiError(
        ERROR_CODES.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'An unexpected error occurred',
        500
      );
    }
  }
});