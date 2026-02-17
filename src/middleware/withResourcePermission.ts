import { NextRequest, NextResponse } from 'next/server';
import { withRouteAuth, type RouteAuthContext, type RouteAuthOptions } from './auth';
import { createAuthApiError } from './auth-errors';
import { createErrorResponse } from '@/lib/api/common/response-formatter';
import { isPermission } from '@/lib/rbac/roles';
import type { Permission } from '@/core/permission/models';

export interface ResourcePermissionOptions<TParams = any> {
  permission: string;
  checkAccess?: (userId: string, params: TParams, req: NextRequest) => Promise<boolean> | boolean;
}

export function withResourcePermission<TParams = any>(
  handler: (req: NextRequest, ctx: RouteAuthContext, params: TParams) => Promise<NextResponse>,
  options: ResourcePermissionOptions<TParams>
) {
  return (req: NextRequest, ctx: { params: TParams }) => {
    const routeOptions: RouteAuthOptions = {};
    if (isPermission(options.permission)) {
      routeOptions.requiredPermissions = [options.permission as unknown as Permission];
    }

    return withRouteAuth(async (r, authCtx) => {
      if (!authCtx.userId) {
        const err = createAuthApiError('MISSING_TOKEN');
        return createErrorResponse(err);
      }

      if (options.checkAccess) {
        try {
          const allowed = await options.checkAccess(authCtx.userId, ctx.params, r);
          if (!allowed) {
            const err = createAuthApiError('INSUFFICIENT_PERMISSIONS', { reason: 'resource' });
            return createErrorResponse(err);
          }
        } catch (error) {
          return createErrorResponse(
            error instanceof Error ? error : new Error('Resource access check failed')
          );
        }
      }

      return handler(r, authCtx, ctx.params);
    }, req, routeOptions);
  };
}
