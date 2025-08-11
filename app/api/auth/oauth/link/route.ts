import { z } from 'zod';
import { OAuthProvider } from '@/types/oauth';
import { withValidatedServices } from '@/src/lib/api/with-services';
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

const postHandler = async ({ request, data, services }: { request: any, data: z.infer<typeof linkRequestSchema>, services: any }) => {
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

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
};

export const POST = withValidatedServices({
  schema: linkRequestSchema,
  requiredServices: ['oauth'],
  requireAuth: true,
  handler: postHandler
});
