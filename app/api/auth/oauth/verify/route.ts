import { z } from 'zod';
import { OAuthProvider } from '@/types/oauth';
import { createApiHandler } from '@/lib/api/route-helpers';
import {
  createSuccessResponse,
  ApiError,
  ERROR_CODES
} from '@/lib/api/common';
import { logUserAction } from '@/lib/audit/auditLogger';

const verifySchema = z.object({
  providerId: z.nativeEnum(OAuthProvider),
  email: z.string().email(),
});

export const POST = createApiHandler(
  verifySchema,
  async (request, _authContext, data, services) => {
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    if (!services.oauth) {
      throw new ApiError(ERROR_CODES.INTERNAL_ERROR, 'OAuth service not configured', 500);
    }

    try {
      const result = await services.oauth.verifyProviderEmail(
        data.providerId,
        data.email
      );

      await logUserAction({
        action: 'OAUTH_VERIFY',
        status: result.success ? 'SUCCESS' : 'FAILURE',
        ipAddress,
        userAgent,
        targetResourceType: 'oauth',
        targetResourceId: data.providerId,
        details: { email: data.email, error: result.success ? null : result.error }
      });

      if (!result.success) {
        throw new ApiError(
          ERROR_CODES.INVALID_REQUEST,
          result.error || 'Verification failed',
          result.status ?? 400
        );
      }

      return createSuccessResponse({ success: true });
    } catch (error: any) {
      await logUserAction({
        action: 'OAUTH_VERIFY',
        status: 'FAILURE',
        ipAddress,
        userAgent,
        targetResourceType: 'oauth',
        targetResourceId: data.providerId,
        details: { error: error instanceof Error ? error.message : String(error) }
      });

      throw new ApiError(
        ERROR_CODES.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Failed to verify provider',
        400
      );
    }
  },
  {
    requireAuth: true,
    rateLimit: { windowMs: 15 * 60 * 1000, max: 10 }
  }
);
