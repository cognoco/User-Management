import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { logUserAction } from '@/lib/audit/auditLogger';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';

const MagicLinkSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
});

/**
 * POST handler for passwordless authentication (magic link) endpoint
 * 
 * Migrated to use withValidatedServices pattern for better dependency management.
 * This endpoint sends a magic link to the provided email for passwordless authentication.
 */
export const POST = withValidatedServices({
  schema: MagicLinkSchema,
  requiredServices: ['auth', 'audit'],
  requireAuth: false, // Passwordless auth doesn't require existing auth
  handler: async (context) => {
    const { data, request, services } = context;
    
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    try {
      const result = await services.auth.sendMagicLink(data.email);

      // Log the magic link request
      if (services.audit) {
        await services.audit.logEvent({
          action: 'MAGIC_LINK_REQUEST',
          status: result.success ? 'SUCCESS' : 'FAILURE',
          ipAddress,
          userAgent,
          targetResourceType: 'auth',
          targetResourceId: data.email,
          details: { error: result.error || null },
        });
      } else {
        // Fallback to direct audit logging if service not available
        await logUserAction({
          action: 'MAGIC_LINK_REQUEST',
          status: result.success ? 'SUCCESS' : 'FAILURE',
          ipAddress,
          userAgent,
          targetResourceType: 'auth',
          targetResourceId: data.email,
          details: { error: result.error || null },
        });
      }

      if (!result.success) {
        throw new ApiError(
          ERROR_CODES.INTERNAL_ERROR, 
          result.error || 'Failed to send magic link', 
          500
        );
      }

      return createSuccessResponse({ 
        message: 'If an account exists with this email, a login link has been sent.' 
      });
      
    } catch (error) {
      // Log failed magic link attempts
      if (services.audit) {
        await services.audit.logEvent({
          action: 'MAGIC_LINK_REQUEST',
          status: 'FAILURE',
          ipAddress,
          userAgent,
          targetResourceType: 'auth',
          targetResourceId: data.email,
          details: { 
            error: error instanceof Error ? error.message : 'Unknown error'
          },
        });
      }
      
      // Re-throw the error to be handled by the wrapper
      throw error;
    }
  }
});
