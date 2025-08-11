import { z } from 'zod';
import { withValidatedServices } from '@/src/lib/api/with-services';
import { logUserAction } from '@/lib/audit/auditLogger';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';

// Request schema for resending SMS during login
const resendSmsSchema = z.object({
  accessToken: z.string(), // Temporary access token from initial login
});

/**
 * POST handler for MFA SMS resend endpoint
 */
const postHandler = async ({ request, data, services }: { request: any, data: z.infer<typeof resendSmsSchema>, services: any }) => {
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  try {
    const { accessToken } = data;
    
    // Resend MFA SMS code using the AuthService
    const result = await services.auth.resendMfaSmsCode(accessToken);
    
    // Log the attempt
    await logUserAction({
      action: 'MFA_SMS_RESEND',
      status: result.success ? 'SUCCESS' : 'FAILURE',
      ipAddress,
      userAgent,
      targetResourceType: 'auth',
      details: { 
        error: result.error || null
      }
    });
    
    // Handle failure
    if (!result.success) {
      console.error('Failed to resend MFA SMS code:', result.error);
      throw new ApiError(
        ERROR_CODES.INVALID_REQUEST,
        result.error || 'Failed to resend verification SMS',
        400
      );
    }

    return createSuccessResponse({
      success: true,
      message: 'Verification code sent successfully',
      testid: 'sms-mfa-resend-success'
    });
  } catch (error) {
    console.error('Error in resend-sms route:', error);
    
    // Log the error
    await logUserAction({
      action: 'MFA_SMS_RESEND_ERROR',
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
};

export const POST = withValidatedServices({
  schema: resendSmsSchema,
  requiredServices: ['auth'],
  requireAuth: false,
  handler: postHandler
});