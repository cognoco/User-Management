import { NextResponse } from 'next/server';
import { withValidatedServices, schemas } from '@/lib/api/with-services';
import { logUserAction } from '@/lib/audit/auditLogger';
import { createSuccessResponse } from '@/lib/api/common';

const failedRefreshAttempts: Record<string, { count: number; last: number }> = {};

/**
 * POST handler for token refresh endpoint
 */
export const POST = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['auth'],
  requireAuth: false,
  handler: async ({ services, request, data, userId, params }) => {
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    const success = await services.auth!.refreshToken();
    let expiresAt: number | null = null;

    if (success) {
      expiresAt = services.auth!.getTokenExpiry();
      const key = ipAddress;
      delete failedRefreshAttempts[key];
    }

    await logUserAction({
      action: 'TOKEN_REFRESH',
      status: success ? 'SUCCESS' : 'FAILURE',
      ipAddress,
      userAgent,
      targetResourceType: 'auth',
      targetResourceId: 'current'
    });

    if (!success) {
      const key = ipAddress;
      const entry = failedRefreshAttempts[key] || { count: 0, last: Date.now() };
      if (Date.now() - entry.last > 5 * 60 * 1000) {
        entry.count = 0;
      }
      entry.count += 1;
      entry.last = Date.now();
      failedRefreshAttempts[key] = entry;
      if (entry.count >= 5) {
        await logUserAction({
          action: 'TOKEN_REFRESH_SUSPICIOUS',
          status: 'FAILURE',
          ipAddress,
          userAgent,
          targetResourceType: 'auth',
          targetResourceId: 'current',
          details: { attempts: entry.count },
        });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return createSuccessResponse({ success: true, expiresAt });
  }
});
