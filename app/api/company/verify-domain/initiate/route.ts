import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { checkRateLimit } from '@/middleware/rate-limit';
import { logUserAction } from '@/lib/audit/auditLogger';
import { ApiError, ERROR_CODES, createSuccessResponse } from '@/lib/api/common';

const InitiateDomainVerificationSchema = z.object({});

export const POST = withValidatedServices({
  schema: InitiateDomainVerificationSchema,
  requiredServices: ['company'],
  requireAuth: true,
  handler: async ({ request, userId, services }) => {
    // Rate limiting check
    if (await checkRateLimit(request, { windowMs: 15 * 60 * 1000, max: 10 })) {
      throw new ApiError(ERROR_CODES.OPERATION_FAILED, 'Too many requests', 429);
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    try {
      const result = await services.company.initiateProfileDomainVerification(userId!);

      await logUserAction({
        userId,
        action: 'PROFILE_DOMAIN_VERIFICATION_INITIATED',
        status: 'SUCCESS',
        ipAddress,
        userAgent,
        targetResourceType: 'company',
        targetResourceId: result.domainName,
      });

      return createSuccessResponse({
        domainName: result.domainName,
        verificationToken: result.verificationToken,
        message: "Verification initiated. Please add the provided token as a TXT record to your domain's DNS settings."
      });
    } catch (error: any) {
      await logUserAction({
        userId,
        action: 'PROFILE_DOMAIN_VERIFICATION_INITIATED',
        status: 'FAILURE',
        ipAddress,
        userAgent,
        targetResourceType: 'company',
        details: { error: error?.message }
      });

      const msg = error?.message || 'Domain verification failed';
      throw new ApiError(ERROR_CODES.INTERNAL_ERROR, msg, 500);
    }
  }
});
