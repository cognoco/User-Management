import { z } from 'zod';
import { createApiHandler } from '@/lib/api/route-helpers';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';

const DisableSchema = z.object({ password: z.string().optional() });

export const POST = createApiHandler(
  DisableSchema,
  async (_req, auth, _data, services) => {
    const result = await services.twoFactor!.disable(auth.userId!, 'totp');
    if (!result.success) {
      throw new ApiError(
        ERROR_CODES.INVALID_REQUEST,
        result.error || 'Failed to disable MFA',
        400
      );
    }
    return createSuccessResponse(result);
  },
  { requireAuth: true }
);
