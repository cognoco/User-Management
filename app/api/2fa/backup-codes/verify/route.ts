import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';

const VerifySchema = z.object({ code: z.string().min(8).max(10) });

const postHandler = async ({ data, userId, services }: { data: z.infer<typeof VerifySchema>, userId?: string, services: any }) => {
  const result = await services.twoFactor.verifyBackupCode(userId!, data.code);
  if (!result.success) {
    throw new ApiError(ERROR_CODES.INVALID_REQUEST, result.error || 'Invalid code', 400);
  }
  return createSuccessResponse(result);
};

export const POST = withValidatedServices({
  schema: VerifySchema,
  requiredServices: ['twoFactor'],
  requireAuth: true,
  handler: postHandler
});
