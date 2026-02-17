import { NextRequest, NextResponse } from 'next/server';
import { getApiAuthService, getSessionFromToken } from '@/services/auth/factory';
import { getApiPermissionService } from '@/services/permission/factory';
import type { Permission } from '@/core/permission/models';
import { isPermission } from '@/lib/rbac/roles';
import { checkPermission, checkAnyPermission, checkAllPermissions } from '@/lib/auth/permissionCheck';
import { createAuthApiError } from './auth-errors';
import { withRouteAuth, type RouteAuthContext, type RouteAuthOptions } from './auth';

interface CacheEntry {
  result: boolean;
  expires: number;
}

const CACHE_TTL = 5_000; // 5 seconds
const GLOBAL_CACHE_KEY = '__UM_PERMISSION_CACHE__';

function getPermissionCache(): Map<string, CacheEntry> {
  if (typeof globalThis === 'undefined') {
    return new Map<string, CacheEntry>();
  }
  const globalObj = globalThis as any;
  if (!globalObj[GLOBAL_CACHE_KEY]) {
    globalObj[GLOBAL_CACHE_KEY] = new Map<string, CacheEntry>();
  }
  return globalObj[GLOBAL_CACHE_KEY] as Map<string, CacheEntry>;
}

export interface PermissionCheckOptions {
  requiredPermission: string;
  resourceId?: string;
}

interface ProtectedHandlerOptions {
  requireAny?: boolean;
  includeUser?: boolean;
}

/**
 * Middleware to check if a user has the required permission
 * @param handler - The route handler function
 * @param options - Permission check options including required permission and optional resource ID
 */
export function withPermissionCheck(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: PermissionCheckOptions
) {
  return async (req: NextRequest) => {
    try {
      const permissionService = getApiPermissionService();
      const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
      const sessionUser = await getSessionFromToken(token);


      if (!sessionUser?.id) {
        console.warn('[withPermissionCheck] no valid session');

        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const userId = sessionUser.id;

      const cacheKey = `${userId}:${options.requiredPermission}`;
      const cache = getPermissionCache();
      let hasPermission: boolean | undefined;
      const cached = cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        hasPermission = cached.result;
        console.log(`[withPermissionCheck] cache hit for ${cacheKey}`);
      }

      if (hasPermission === undefined) {
        console.log(`[withPermissionCheck] checking ${cacheKey}`);
        hasPermission = await permissionService.hasPermission(
          userId,
          options.requiredPermission as Permission
        );
        cache.set(cacheKey, {
          result: hasPermission,
          expires: Date.now() + CACHE_TTL,
        });
      }

      if (!hasPermission) {
        console.warn(
          `[withPermissionCheck] user ${userId} lacks ${options.requiredPermission}`
        );
        return new NextResponse(
          JSON.stringify({ error: 'Insufficient permissions' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      const userRoles = await permissionService.getUserRoles(userId);
      const roleName = userRoles[0]?.role?.name || '';

      const requestWithContext = new Request(req.url, {
        ...req,
        headers: new Headers({
          ...req.headers,
          'x-permission-checked': 'true',
          'x-user-role': roleName,
        }),
      });

      return handler(requestWithContext as NextRequest);
    } catch (error) {
      console.error('Permission check error:', error);
      return new NextResponse(
        JSON.stringify({ error: 'Internal server error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

/**
 * Helper function to create a permission-protected route handler
 */
export function createProtectedHandler(
  handler: (req: NextRequest, ctx?: RouteAuthContext) => Promise<NextResponse>,
  requiredPermissions: Permission | Permission[],
  options: ProtectedHandlerOptions = {}
) {
  const permissions = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  return (req: NextRequest, ctx: any = {}) => {
    return withRouteAuth(
      async (r, auth) => {
        if (!auth.userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const hasPermission = options.requireAny
          ? await checkAnyPermission(auth.userId, permissions)
          : await checkAllPermissions(auth.userId, permissions);

        if (!hasPermission) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return handler(r, ctx);
      },
      req,
      { includeUser: options.includeUser }
    );
  };
}
import { createErrorResponse } from '@/lib/api/common/response-formatter';

/**
 * Simple permission middleware used by some API routes.
 * TODO: Replace with real permission checks using the permission service.
 */
export async function withPermission(
  permission: string,
  handler: (req: NextRequest, userId: string) => Promise<NextResponse>,
  req: NextRequest
): Promise<NextResponse> {
  return withRouteAuth(
    async (r, ctx) => {
      if (!ctx.userId) {
        const err = createAuthApiError('MISSING_TOKEN');
        return createErrorResponse(err);
      }

      let hasPermission = false;

      if (isPermission(permission)) {
        hasPermission = await checkPermission(ctx.userId, permission as Permission);
      } else {
        console.warn(`Invalid permission '${permission}' passed to withPermission`);
      }

      if (!hasPermission) {
        const forbiddenError = createAuthApiError('INSUFFICIENT_PERMISSIONS', { permission });
        return createErrorResponse(forbiddenError);
      }

      return handler(r, ctx.userId);
    },
    req
  );
}
