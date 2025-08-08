export const runtime = 'nodejs';
import { z } from 'zod';
import { withSecurity } from '@/middleware/with-security';
import { createApiHandler } from '@/lib/api/route-helpers';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';
import { logUserAction } from '@/lib/audit/auditLogger';

const RequestSchema = z.object({
  phase: z.enum(['options', 'verification']),
  credential: z.any().optional(),
  userId: z.string()
});

const handler = createApiHandler(
  RequestSchema,
  async (req, _auth, data, services) => {
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const userId = data.userId;

    try {
      if (data.phase === 'options') {
        const options = await services.twoFactor!.startWebAuthnRegistration(userId);
        if (!options.success) {
          throw new ApiError(ERROR_CODES.INVALID_REQUEST, options.error || 'Failed to start authentication', 400);
        }
        await logUserAction({
          action: 'WEBAUTHN_VERIFICATION_INITIATED',
          status: 'INITIATED',
          ipAddress,
          userAgent,
          targetResourceType: 'auth_method',
          targetResourceId: userId
        });
        return createSuccessResponse(options);
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
        action: 'WEBAUTHN_VERIFICATION_COMPLETED',
        status: 'SUCCESS',
        ipAddress,
        userAgent,
        targetResourceType: 'auth_method',
        targetResourceId: userId
      });
      return createSuccessResponse({ verified: true, user: { id: userId } });
    } catch (e: any) {
      await logUserAction({
        action: 'WEBAUTHN_VERIFICATION_FAILED',
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
  { requireAuth: false }
);

export const POST = withSecurity(handler);
