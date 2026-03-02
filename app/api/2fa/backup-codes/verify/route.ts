import { z } from 'zod';
import { createApiHandler } from '@/lib/api/route-helpers';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';

const VerifySchema = z.object({ code: z.string().min(8).max(10) });

export const POST = createApiHandler(
  VerifySchema,
  async (_req, auth, data, services) => {
    const result = await services.twoFactor!.verifyBackupCode(auth.userId!, data.code);
    if (!result.success) {
      throw new ApiError(ERROR_CODES.INVALID_REQUEST, result.error || 'Invalid code', 400);
    }
    return createSuccessResponse(result);
  },
  { requireAuth: true }
);
