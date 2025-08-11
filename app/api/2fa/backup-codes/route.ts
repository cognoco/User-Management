import { withValidatedServices, schemas } from '@/lib/api/with-services';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';

export const POST = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['twoFactor'],
  requireAuth: true,
  handler: async ({ userId, services }) => {
    const result = await services.twoFactor.regenerateBackupCodes(userId);
    if (!result.success) {
      throw new ApiError(
        ERROR_CODES.INVALID_REQUEST,
        result.error || 'Failed to generate backup codes',
        400
      );
    }
    return createSuccessResponse({ codes: result.codes });
  }
});
