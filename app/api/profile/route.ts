import { NextResponse } from 'next/server';
import { createApiHandler, emptySchema } from '@/lib/api/route-helpers';
import { createSuccessResponse } from '@/lib/api/common';
import { logUserAction } from '@/lib/audit/auditLogger';
import { checkRateLimit } from '@/middleware/rate-limit';
import { PermissionValues } from '@/types/rbac';
import { personalProfileUpdateSchema } from '@/lib/schemas/profile.schema';
import type { ProfileUpdatePayload } from '@/core/user/models';


// GET handler - Fetch user profile
export const GET = createApiHandler(
  emptySchema,
  async (request, { userId }, _data, services) => {
    const ipAddress = request.headers.get("x-forwarded-for") || "unknown";
    const userAgent = request.headers.get('user-agent');
    if (await checkRateLimit(request)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    if (!userId) {
      await logUserAction({
        action: 'USER_PROFILE_GET_FAILURE',
        status: 'FAILURE',
        ipAddress,
        userAgent,
        targetResourceType: 'user_profile',
      });
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    try {
      const profile = await services.user.getUserProfile(userId);
      if (!profile) {
        await logUserAction({
          userId,
          action: 'USER_PROFILE_GET_NOT_FOUND',
          status: 'FAILURE',
          ipAddress,
          userAgent,
          targetResourceType: 'user_profile',
          targetResourceId: userId,
        });
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }

      await logUserAction({
        userId,
        action: 'USER_PROFILE_GET_SUCCESS',
        status: 'SUCCESS',
        ipAddress,
        userAgent,
        targetResourceType: 'user_profile',
        targetResourceId: userId,
      });
      return createSuccessResponse(profile);
    } catch (error) {
      await logUserAction({
        userId,
        action: 'USER_PROFILE_GET_ERROR',
        status: 'FAILURE',
        ipAddress,
        userAgent,
        targetResourceType: 'user_profile',
        targetResourceId: userId,
        details: { error: (error as Error).message },
      });
      return NextResponse.json(
        { error: 'An internal server error occurred.' },
        { status: 500 }
      );
    }
  },
  {
    requireAuth: true,
    requiredPermissions: [PermissionValues.EDIT_USER_PROFILES],
  }
);

// PATCH handler - Update user profile
export const PATCH = createApiHandler(
  personalProfileUpdateSchema,
  async (request, { userId }, data, services) => {
    const ipAddress = request.headers.get("x-forwarded-for") || "unknown";
    const userAgent = request.headers.get('user-agent');
    if (await checkRateLimit(request)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    if (!userId) {
      await logUserAction({
        action: 'USER_PROFILE_UPDATE_FAILURE',
        status: 'FAILURE',
        ipAddress,
        userAgent,
        targetResourceType: 'user_profile',
      });
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    try {
      const result = await services.user.updateUserProfile(userId, data as ProfileUpdatePayload);
      await logUserAction({
        userId,
        action: 'USER_PROFILE_UPDATE_SUCCESS',
        status: 'SUCCESS',
        ipAddress,
        userAgent,
        targetResourceType: 'user_profile',
        targetResourceId: userId,
      });
      return createSuccessResponse(result.profile);
    } catch (error) {
      await logUserAction({
        userId,
        action: 'USER_PROFILE_UPDATE_ERROR',
        status: 'FAILURE',
        ipAddress,
        userAgent,
        targetResourceType: 'user_profile',
        targetResourceId: userId,
        details: { error: (error as Error).message },
      });
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }
  },
  {
    requireAuth: true,
    requiredPermissions: [PermissionValues.EDIT_USER_PROFILES],
  }
);
