import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';
import { checkRateLimit } from '@/middleware/rate-limit';
import { profileSchema } from '@/types/database';
import { logUserAction } from '@/lib/audit/auditLogger';

// Derive schema specifically for privacy settings update
const PrivacySettingsUpdateSchema = profileSchema.shape.privacySettings;


export const PATCH = withValidatedServices({
  schema: PrivacySettingsUpdateSchema,
  requiredServices: ['user'],
  requireAuth: true,
  handler: async ({ request, auth, data, services }) => {
    const ipAddress = request.ip;
    const userAgent = request.headers.get('user-agent');
    const isRateLimited = await checkRateLimit(request);
    if (isRateLimited) {
      throw new ApiError(ERROR_CODES.OPERATION_FAILED, 'Too many requests', 429);
    }

    const userId = auth.userId!;
    try {
      const result = await services.user.updateUserProfile(
        userId,
        { privacySettings: data } as any
      );

      if (!result.success || !result.profile) {
        await logUserAction({
          userId,
          action: 'PRIVACY_SETTINGS_UPDATE_FAILURE',
          status: 'FAILURE',
          ipAddress,
          userAgent,
          targetResourceType: 'user_profile_privacy',
          targetResourceId: userId,
          details: { reason: result.error || 'update failed' },
        });
        throw new ApiError(ERROR_CODES.INTERNAL_ERROR, 'Failed to update privacy settings.', 500);
      }

      await logUserAction({
        userId,
        action: 'PRIVACY_SETTINGS_UPDATE_SUCCESS',
        status: 'SUCCESS',
        ipAddress,
        userAgent,
        targetResourceType: 'user_profile_privacy',
        targetResourceId: userId,
        details: { updatedSettings: result.profile.privacySettings },
      });

      return createSuccessResponse(result.profile.privacySettings);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      await logUserAction({
        userId,
        action: 'PRIVACY_SETTINGS_UPDATE_UNEXPECTED_ERROR',
        status: 'FAILURE',
        ipAddress,
        userAgent,
        targetResourceType: 'user_profile_privacy',
        targetResourceId: userId,
        details: { error: message },
      });
      throw new ApiError(ERROR_CODES.INTERNAL_ERROR, 'An internal server error occurred.', 500);
    }
  },
});
