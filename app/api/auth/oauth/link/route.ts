import { z } from 'zod';
import { OAuthProvider } from '@/types/oauth';
import { createApiHandler } from '@/lib/api/route-helpers';
import {
  createSuccessResponse,
  ApiError,
  ERROR_CODES
} from '@/lib/api/common';
import { logUserAction } from '@/lib/audit/auditLogger';

const linkRequestSchema = z.object({
  provider: z.nativeEnum(OAuthProvider),
  code: z.string(),
});

export const POST = createApiHandler(
  linkRequestSchema,
  async (request, _authContext, data, services) => {
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    if (!services.oauth) {
      throw new ApiError(ERROR_CODES.INTERNAL_ERROR, 'OAuth service not configured', 500);
    }

    const result = await services.oauth.linkProvider(data.provider, data.code);

    await logUserAction({
      action: 'OAUTH_LINK',
      status: result.success ? 'SUCCESS' : 'FAILURE',
      ipAddress,
      userAgent,
      targetResourceType: 'oauth',
      targetResourceId: data.provider,
      details: { error: result.success ? null : result.error }
    });

    if (!result.success) {
      throw new ApiError(
        ERROR_CODES.INVALID_REQUEST,
        result.error || 'Failed to link provider',
        result.status ?? 400
      );
    }

    return createSuccessResponse({
      success: true,
      linkedProviders: result.linkedProviders ?? [],
      user: result.user
    });
  },
  {
    requireAuth: true,
    rateLimit: { windowMs: 15 * 60 * 1000, max: 10 }
  }
);
