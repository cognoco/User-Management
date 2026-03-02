import { z } from 'zod';
import { OAuthProvider } from '@/types/oauth';
import { createApiHandler } from '@/lib/api/route-helpers';
import {
  createSuccessResponse,
  ApiError,
  ERROR_CODES
} from '@/lib/api/common';
import { logUserAction } from '@/lib/audit/auditLogger';

// Request schema
const callbackRequestSchema = z.object({
  provider: z.nativeEnum(OAuthProvider),
  code: z.string(),
  redirectUri: z.string().url(),
  state: z.string().optional(), // Add state for CSRF protection
});

export const POST = createApiHandler(
  callbackRequestSchema,
  async (request, _authContext, data, services) => {
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    if (!services.oauth) {
      throw new ApiError(ERROR_CODES.INTERNAL_ERROR, 'OAuth service not configured', 500);
    }

    try {
      const result = await services.oauth.handleCallback(
        data.provider,
        data.code,
        data.state
      );

      await logUserAction({
        action: 'OAUTH_CALLBACK',
        status: 'SUCCESS',
        ipAddress,
        userAgent,
        targetResourceType: 'oauth',
        targetResourceId: data.provider
      });

      return createSuccessResponse(result);
    } catch (error: any) {
      await logUserAction({
        action: 'OAUTH_CALLBACK',
        status: 'FAILURE',
        ipAddress,
        userAgent,
        targetResourceType: 'oauth',
        targetResourceId: data.provider,
        details: { error: error instanceof Error ? error.message : String(error) }
      });

      throw new ApiError(
        ERROR_CODES.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'OAuth callback failed',
        400
      );
    }
  },
  {
    requireAuth: false,
    rateLimit: { windowMs: 15 * 60 * 1000, max: 30 }
  }
);
