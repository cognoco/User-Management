import { NextRequest, NextResponse } from 'next/server';
import { withRouteAuth, type RouteAuthContext, type RouteAuthOptions } from './auth';
import { checkRateLimit } from './rate-limit';
import { ApiError, ERROR_CODES } from '@/lib/api/common';
import { createErrorResponse } from '@/lib/api/common/response-formatter';

export interface ProtectedRouteOptions {
  skipRateLimit?: boolean;
  requiredPermission?: string;
}

export type ProtectedRouteHandler = (
  req: NextRequest,
  auth: RouteAuthContext,
  ctx?: any
) => Promise<NextResponse>;

export function withProtectedRoute(
  handler: ProtectedRouteHandler,
  options: ProtectedRouteOptions = {}
) {
  return async (req: NextRequest, ctx?: any): Promise<NextResponse> => {
    try {
      if (!options.skipRateLimit) {
        const limited = await checkRateLimit(req);
        if (limited) {
          const err = new ApiError(
            ERROR_CODES.OPERATION_FAILED,
            'Too many requests, please try again later.',
            429
          );
          return createErrorResponse(err);
        }
      }

      return withRouteAuth(
        (r, auth) => handler(r, auth, ctx),
        req,
        (options.requiredPermission
          ? { requiredPermissions: [options.requiredPermission] }
          : {}) as RouteAuthOptions
      );
    } catch (error) {
      const apiError =
        error instanceof ApiError
          ? error
          : new ApiError(
              'SERVER_GENERAL_001',
              error instanceof Error ? error.message : 'An unexpected error occurred',
              500
            );
      return createErrorResponse(apiError);
    }
  };
}
