import { z } from 'zod';
import { OAuthProvider } from '@/types/oauth';
import { withValidatedServices } from '@/lib/api/with-services';
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

const postHandler = async ({ request, data, services }: { request: any, data: z.infer<typeof verifySchema>, services: any }) => {
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

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
};

export const POST = withValidatedServices({
  schema: verifySchema,
  requiredServices: ['oauth'],
  requireAuth: true,
  handler: postHandler
});
