import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { logUserAction } from '@/lib/audit/auditLogger';
import {
  createSuccessResponse,
  ApiError,
  ERROR_CODES
} from '@/lib/api/common';

const DeleteAccountSchema = z.object({ password: z.string().min(1) });

/**
 * DELETE handler for account deletion endpoint
 */
export const DELETE = withValidatedServices({
  schema: DeleteAccountSchema,
  requiredServices: ['auth'],
  requireAuth: true,
  handler: async ({ request, auth, data, services }) => {
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    try {
      await services.auth.deleteAccount(data.password);
      
      await logUserAction({
        userId: auth.userId,
        action: 'ACCOUNT_DELETED',
        status: 'SUCCESS',
        ipAddress,
        userAgent,
        targetResourceType: 'auth',
        targetResourceId: auth.userId
      });
      
      return createSuccessResponse({ message: 'Account successfully deleted' });
    } catch (error) {
      await logUserAction({
        userId: auth.userId,
        action: 'ACCOUNT_DELETE_FAILED',
        status: 'FAILURE',
        ipAddress,
        userAgent,
        targetResourceType: 'auth',
        targetResourceId: auth.userId,
        details: { error: (error as Error)?.message }
      });
      
      throw new ApiError(
        ERROR_CODES.OPERATION_FAILED,
        'Failed to delete account',
        400
      );
    }
  },
});