import { NextResponse } from 'next/server';
import { withValidatedServices, schemas } from '@/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';
import { logUserAction } from '@/lib/audit/auditLogger';
import { checkRateLimit } from '@/middleware/rate-limit';
import { PermissionValues } from '@/types/rbac';
import { personalProfileUpdateSchema } from '@/lib/schemas/profile.schema';


// GET handler - Fetch user profile
const getHandler = async ({ request, userId, services }: { request: any, userId?: string, services: any }) => {
  const ipAddress = (request as any).ip;
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
};

export const GET = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['user'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.EDIT_USER_PROFILES],
  handler: getHandler
});

// PATCH handler - Update user profile
const patchHandler = async ({ request, userId, data, services }: { request: any, userId?: string, data: any, services: any }) => {
  const ipAddress = (request as any).ip;
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
    const result = await services.user.updateUserProfile(userId, data);
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
};

export const PATCH = withValidatedServices({
  schema: personalProfileUpdateSchema,
  requiredServices: ['user'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.EDIT_USER_PROFILES],
  handler: patchHandler
});
