import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema } from 'zod';
import { withProtectedRoute } from '@/middleware/protected-route';
import { withValidation } from '@/middleware/validation';
import { withErrorHandling } from '@/middleware/error-handling';
import type { RouteAuthContext } from '@/middleware/auth';
import type { RateLimitOptions } from '@/middleware/rate-limit';
import { withSecurity } from '@/middleware/with-security';

export interface RouteHandlerOptions<T, C = any> {
  handler: (
    req: NextRequest,
    ctx: RouteAuthContext,
    data: T,
    routeCtx?: C
  ) => Promise<NextResponse>;
  schema?: ZodSchema<T>;
  permission?: string;
  // Rate limit options
  skipRateLimit?: boolean;
  rateLimitOptions?: RateLimitOptions;
  // Data extraction
  parse?: (req: NextRequest) => Promise<unknown> | unknown;
  // Security
  applySecurity?: boolean;
  // Skip auth entirely (for public endpoints)
  skipAuth?: boolean;
}

export function createRouteHandler<T, C = any>(options: RouteHandlerOptions<T, C>) {
  const {
    handler,
    schema,
    permission,
    skipRateLimit,
    rateLimitOptions,
    parse,
    applySecurity = false,
    skipAuth = false
  } = options;

  async function execute(req: NextRequest, ctx: RouteAuthContext, routeCtx?: C) {
    // Default parser based on HTTP method
    let input: unknown;
    if (parse) {
      input = await parse(req);
    } else if (req.method !== 'GET') {
      try {
        input = await req.json();
      } catch {
        input = undefined;
      }
    } else {
      // For GET, use query params
      input = Object.fromEntries(new URL(req.url).searchParams.entries());
    }

    // Apply validation if schema provided
    if (schema) {
      return withValidation(
        schema as ZodSchema<T>,
        (r, data) => handler(r, ctx, data, routeCtx),
        req,
        input
      );
    }
    
    return handler(req, ctx, input as T, routeCtx);
  }

  // Return a function that can accept route context (e.g. params)
  return function route(req: NextRequest, routeCtx?: C): Promise<NextResponse> {
    let responseHandler: (r: NextRequest) => Promise<NextResponse>;
    
    if (skipAuth) {
      // Skip authentication entirely for public endpoints
      responseHandler = (r) => execute(r, {} as RouteAuthContext, routeCtx);
    } else {
      // Use protected route for auth + rate limiting
      responseHandler = (r) => 
        withProtectedRoute(
          (r2, auth) => execute(r2, auth, routeCtx),
          { 
            skipRateLimit, 
            requiredPermission: permission,
            ...(rateLimitOptions ? { rateLimitOptions } : {})
          }
        )(r);
    }
    
    // Apply security if needed
    if (applySecurity) {
      responseHandler = (r) => withSecurity(responseHandler)(r);
    }
    
    // Always wrap with error handling
    return withErrorHandling(responseHandler, req);
  };
}
