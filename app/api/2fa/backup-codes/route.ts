import { createApiHandler, emptySchema } from '@/lib/api/route-helpers';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';

export const POST = createApiHandler(
  emptySchema,
  async (_req, auth, _data, services) => {
    const result = await services.twoFactor!.regenerateBackupCodes(auth.userId!);
    if (!result.success) {
      throw new ApiError(
        ERROR_CODES.INVALID_REQUEST,
        result.error || 'Failed to generate backup codes',
        400
      );
    }
    return createSuccessResponse({ codes: result.codes });
  },
  { requireAuth: true }
);
