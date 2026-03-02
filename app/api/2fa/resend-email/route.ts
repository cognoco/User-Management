import { createApiHandler, emptySchema } from '@/lib/api/route-helpers';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';

export const POST = createApiHandler(
  emptySchema,
  async (_req, auth, _data, services) => {
    const result = await services.twoFactor!.startSetup({
      userId: auth.userId!,
      method: 'email'
    });
    if (!result.success) {
      throw new ApiError(
        ERROR_CODES.INVALID_REQUEST,
        result.error || 'Failed to resend verification email',
        400
      );
    }
    return createSuccessResponse({
      success: true,
      message: 'Verification code sent successfully',
      testid: 'email-mfa-resend-success'
    });
  },
  { requireAuth: true }
);
