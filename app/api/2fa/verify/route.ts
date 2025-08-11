import { z } from 'zod';
import { withValidatedServices } from '@/src/lib/api/with-services';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';
import { TwoFactorMethod } from '@/types/2fa';

const VerifySchema = z.object({
  method: z.nativeEnum(TwoFactorMethod),
  code: z.string().min(4)
});

const postHandler = async ({ data, userId, services }: { data: z.infer<typeof VerifySchema>, userId?: string, services: any }) => {
  const result = await services.twoFactor.verifySetup({
    userId: userId!,
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
};

export const POST = withValidatedServices({
  schema: VerifySchema,
  requiredServices: ['twoFactor'],
  requireAuth: true,
  handler: postHandler
});
