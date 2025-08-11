import { withValidatedServices, schemas } from '@/src/lib/api/with-services';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';

const postHandler = async ({ userId, services }: { userId?: string, services: any }) => {
  const result = await services.twoFactor.startSetup({
    userId: userId!,
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
};

export const POST = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['twoFactor'],
  requireAuth: true,
  handler: postHandler
});
