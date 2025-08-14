import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';

const DisableSchema = z.object({ password: z.string().optional() });

const postHandler = async ({ userId, services }: { userId?: string, services: any }) => {
  const result = await services.twoFactor.disable(userId!, 'totp');
  if (!result.success) {
    throw new ApiError(
      ERROR_CODES.INVALID_REQUEST,
      result.error || 'Failed to disable MFA',
      400
    );
  }
  return createSuccessResponse(result);
};

export const POST = withValidatedServices({
  schema: DisableSchema,
  requiredServices: ['twoFactor'],
  requireAuth: true,
  handler: postHandler
});
