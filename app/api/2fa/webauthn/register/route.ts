export const runtime = 'nodejs';
import { z } from 'zod';
import { withSecurity } from '@/middleware/with-security';
import { createApiHandler } from '@/lib/api/route-helpers';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';
import { logUserAction } from '@/lib/audit/auditLogger';

const RequestSchema = z.object({
  phase: z.enum(['options', 'verification']),
  credential: z.any().optional()
});

const handler = createApiHandler(
  RequestSchema,
  async (req, auth, data, services) => {
    const userId = auth.userId;
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    try {
      if (data.phase === 'options') {
        const res = await services.twoFactor!.startWebAuthnRegistration(userId);
        if (!res.success) {
          throw new ApiError(ERROR_CODES.INVALID_REQUEST, res.error || 'Failed to start registration', 400);
        }
        await logUserAction({
          userId,
          action: 'WEBAUTHN_REGISTRATION_INITIATED',
          status: 'INITIATED',
          ipAddress,
          userAgent,
          targetResourceType: 'auth_method',
          targetResourceId: userId
        });
        return createSuccessResponse(res);
      }

      if (!data.credential) {
        throw new ApiError(ERROR_CODES.INVALID_REQUEST, 'Missing credential', 400);
      }

      const verification = await services.twoFactor!.verifyWebAuthnRegistration({
        userId,
        method: 'webauthn',
        code: data.credential
      });
      if (!verification.success) {
        throw new ApiError(ERROR_CODES.INVALID_REQUEST, verification.error || 'Verification failed', 400);
      }
      await logUserAction({
        userId,
        action: 'WEBAUTHN_REGISTRATION_COMPLETED',
        status: 'SUCCESS',
        ipAddress,
        userAgent,
        targetResourceType: 'auth_method',
        targetResourceId: userId
      });
      return createSuccessResponse(verification);
    } catch (e: any) {
      await logUserAction({
        userId,
        action: 'WEBAUTHN_REGISTRATION_FAILED',
        status: 'FAILURE',
        ipAddress,
        userAgent,
        targetResourceType: 'auth_method',
        targetResourceId: userId,
        details: { error: e instanceof Error ? e.message : String(e) }
      });
      throw e;
    }
  },
  { requireAuth: true }
);

export const POST = withSecurity(handler);
