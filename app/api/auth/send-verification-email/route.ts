import { z } from 'zod';
import { createApiHandlerWithServices } from '@/lib/api/route-helpers-v2';
import { configureUserManagement } from '@/lib/config/configure-user-management';
import { logUserAction } from '@/lib/audit/auditLogger';
import { createSuccessResponse } from '@/lib/api/common';

// Configure services at module level using dependency injection
const services = configureUserManagement();

// Zod schema for the request body
const ResendEmailSchema = z.object({
  email: z.string().email({ message: 'Invalid email address provided.' }),
});

/**
 * POST handler for sending verification email endpoint
 */
export const POST = createApiHandlerWithServices(
  ResendEmailSchema,
  async (request, _authContext, data, injectedServices) => {
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const { email } = data;

    const result = await injectedServices.auth.sendVerificationEmail(email);

    await logUserAction({
      action: 'VERIFICATION_EMAIL_REQUEST',
      status: result.success ? 'SUCCESS' : 'FAILURE',
      ipAddress,
      userAgent,
      targetResourceType: 'auth',
      targetResourceId: email,
      details: { error: result.error || null }
    });

    if (\!result.success) {
      console.error('Verification email resend error:', result.error);
    }

    // Always return success message for security (don't reveal if email exists)
    return createSuccessResponse({
      message:
        'If an account exists with this email, a verification email has been sent.'
    });
  },
  services,
  { 
    requireAuth: false, // Sending verification email doesn't require auth
    rateLimit: { windowMs: 15 * 60 * 1000, max: 5 } // Very strict rate limiting
  }
);
EOF < /dev/null