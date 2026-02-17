import { type NextRequest, NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/api/route-helpers';
import { createSuccessResponse } from '@/lib/api/common';
import { checkRateLimit } from '@/middleware/rate-limit';
import { profileSchema } from '@/types/database';
import { logUserAction } from '@/lib/audit/auditLogger';

// Derive schema specifically for privacy settings update
const PrivacySettingsUpdateSchema = profileSchema.shape.privacySettings;


export const PATCH = createApiHandler(
  PrivacySettingsUpdateSchema,
  async (request: NextRequest, { userId }, settings, services) => {
    const ipAddress = request.headers.get("x-forwarded-for") || "unknown";
    const userAgent = request.headers.get('user-agent');
    const isRateLimited = await checkRateLimit(request);
    if (isRateLimited) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    let userIdForLogging: string | null = userId ?? null;
    try {
      const result = await services.user.updateUserProfile(
        userId!,
        { privacySettings: settings } as any
      );

      if (!result.success || !result.profile) {
        await logUserAction({
          userId: userIdForLogging,
          action: 'PRIVACY_SETTINGS_UPDATE_FAILURE',
          status: 'FAILURE',
          ipAddress,
          userAgent,
          targetResourceType: 'user_profile_privacy',
          targetResourceId: userIdForLogging,
          details: { reason: result.error || 'update failed' },
        });
        return NextResponse.json(
          { error: 'Failed to update privacy settings.' },
          { status: 500 }
        );
      }

      await logUserAction({
        userId: userIdForLogging,
        action: 'PRIVACY_SETTINGS_UPDATE_SUCCESS',
        status: 'SUCCESS',
        ipAddress,
        userAgent,
        targetResourceType: 'user_profile_privacy',
        targetResourceId: userIdForLogging,
        details: { updatedSettings: result.profile.privacySettings },
      });

      return createSuccessResponse(result.profile.privacySettings);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      await logUserAction({
        userId: userIdForLogging,
        action: 'PRIVACY_SETTINGS_UPDATE_UNEXPECTED_ERROR',
        status: 'FAILURE',
        ipAddress,
        userAgent,
        targetResourceType: 'user_profile_privacy',
        targetResourceId: userIdForLogging,
        details: { error: message },
      });
      return NextResponse.json(
        { error: 'An internal server error occurred.' },
        { status: 500 }
      );
    }
  },
  { requireAuth: true }
);
