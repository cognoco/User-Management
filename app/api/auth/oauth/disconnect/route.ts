import { z } from "zod";
import { OAuthProvider } from "@/types/oauth";
import { withValidatedServices } from "@/src/lib/api/with-services";
import {
  createSuccessResponse,
  ApiError,
  ERROR_CODES
} from '@/lib/api/common';
import { logUserAction } from '@/lib/audit/auditLogger';

// Request schema
const disconnectRequestSchema = z.object({
  provider: z.nativeEnum(OAuthProvider),
});

const postHandler = async ({ request, data, userId, services }: { request: any, data: z.infer<typeof disconnectRequestSchema>, userId?: string, services: any }) => {
  const { provider } = data;
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  const result = await services.oauth.disconnectProvider(provider);

  await logUserAction({
    userId: userId!,
    action: 'OAUTH_DISCONNECT',
    status: result.success ? 'SUCCESS' : 'FAILURE',
    ipAddress,
    userAgent,
    targetResourceType: 'oauth',
    targetResourceId: provider,
    details: { error: result.success ? null : result.error }
  });

  if (!result.success) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_ERROR,
      result.error || 'Failed to disconnect provider',
      result.status ?? 500
    );
  }

  return createSuccessResponse({ success: true });
};

export const POST = withValidatedServices({
  schema: disconnectRequestSchema,
  requiredServices: ['oauth'],
  requireAuth: true,
  handler: postHandler
});
