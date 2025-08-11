import { withValidatedServices, schemas } from '@/lib/api/with-services';
import { logUserAction } from '@/lib/audit/auditLogger';
import {
  createSuccessResponse,
  ApiError,
  ERROR_CODES
} from '@/lib/api/common';

/**
 * POST handler for MFA setup endpoint
 * Migrated to use withValidatedServices pattern for better dependency management.
 */
export const POST = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['auth'],
  requireAuth: true, // MFA setup requires authentication
  handler: async ({ request, userId, services }) => {
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    const result = await services.auth.setupMFA();

    await logUserAction({
      userId,
      action: 'MFA_SETUP',
      status: result.success ? 'SUCCESS' : 'FAILURE',
      ipAddress,
      userAgent,
      targetResourceType: 'auth',
      targetResourceId: userId
    });

    if (!result.success) {
      throw new ApiError(
        ERROR_CODES.INVALID_REQUEST,
        result.error || 'MFA setup failed',
        400
      );
    }

    return createSuccessResponse(result);
  }
});
