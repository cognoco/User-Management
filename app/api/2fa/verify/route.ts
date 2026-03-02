import { z } from 'zod';
import { createApiHandler } from '@/lib/api/route-helpers';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';
import { TwoFactorMethod } from '@/types/2fa';

const VerifySchema = z.object({
  method: z.nativeEnum(TwoFactorMethod),
  code: z.string().min(4)
});

export const POST = createApiHandler(
  VerifySchema,
  async (_req, auth, data, services) => {
    const result = await services.twoFactor!.verifySetup({
      userId: auth.userId!,
      method: data.method,
      code: data.code
    });

    if (!result.success) {
      throw new ApiError(
        ERROR_CODES.INVALID_REQUEST,
        result.error || 'Verification failed',
        400
      );
    }

    return createSuccessResponse(result);
  },
  { requireAuth: true }
);
