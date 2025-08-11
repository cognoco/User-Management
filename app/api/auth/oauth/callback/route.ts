import { z } from 'zod';
import { OAuthProvider } from '@/types/oauth';
import { withValidatedServices } from '@/src/lib/api/with-services';
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

const postHandler = async ({ request, data, services }: { request: any, data: z.infer<typeof callbackRequestSchema>, services: any }) => {
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

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
};

export const POST = withValidatedServices({
  schema: callbackRequestSchema,
  requiredServices: ['oauth'],
  requireAuth: false,
  handler: postHandler
});
