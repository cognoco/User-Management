import { z } from 'zod';
import { checkRateLimit } from '@/middleware/rate-limit';
import { decode } from 'base64-arraybuffer';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';

// Schema for logo upload request body
const LogoUploadSchema = z.object({
  logo: z.string(), // Expecting base64 string
  filename: z.string().optional(), // Optional filename for content type inference
});

export const POST = withValidatedServices({
  schema: LogoUploadSchema,
  requiredServices: ['user'],
  requireAuth: true,
  handler: async ({ request, auth, data, services }) => {
    const isRateLimited = await checkRateLimit(request);
    if (isRateLimited) {
      throw new ApiError(ERROR_CODES.OPERATION_FAILED, 'Too many requests', 429);
    }

    const base64Data = data.logo.replace(/^data:.+;base64,/, '');
    const fileBuffer = decode(base64Data);

    const result = await services.user.uploadCompanyLogo(auth.userId!, auth.userId!, fileBuffer);
    if (!result.success || !result.url) {
      throw new ApiError(ERROR_CODES.INTERNAL_ERROR, result.error || 'Failed to upload logo', 500);
    }

    return createSuccessResponse({ companyLogoUrl: result.url });
  },
});

export const DELETE = withValidatedServices({
  schema: z.object({}),
  requiredServices: ['user'],
  requireAuth: true,
  handler: async ({ request, auth, services }) => {
    const isRateLimited = await checkRateLimit(request);
    if (isRateLimited) {
      throw new ApiError(ERROR_CODES.OPERATION_FAILED, 'Too many requests', 429);
    }

    const result = await services.user.deleteCompanyLogo(auth.userId!, auth.userId!);
    if (!result.success) {
      throw new ApiError(ERROR_CODES.INTERNAL_ERROR, result.error || 'Failed to remove logo', 500);
    }

    return createSuccessResponse({ message: 'Company logo removed successfully.' });
  },
});
