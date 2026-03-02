import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from './error-handling';
import { withRouteAuth, type RouteAuthOptions } from './auth';

// Re-export auth context types so callers can import from either location.
export type { RouteAuthContext, AuthContext } from './auth';
import { withValidation } from './validation';
import type { ZodSchema } from 'zod';
import { createRateLimit, type RateLimitOptions } from './rate-limit';
import {
  middlewareConfigSchema,
  type MiddlewareConfig,
} from '@/lib/schemas/middleware-config.schema';
import {
  getDefaultMiddlewareConfig,
  type ApiRouteType,
} from '../../config/api-routes.config';

/**
 * Generic route handler used by the middleware chain.
 *
 * @param req  Incoming {@link NextRequest} instance.
 * @param ctx  Optional context provided by previous middleware.
 * @param data Optional validated data passed from {@link validationMiddleware}.
 */
export type RouteHandler = (
  req: NextRequest,
  ctx?: any,
  data?: any
) => Promise<NextResponse>;

/**
 * Function that wraps a {@link RouteHandler} and returns a new handler.
 * Each middleware can perform work before or after calling the next handler.
 */
export type RouteMiddleware = (handler: RouteHandler) => RouteHandler;

/**
 * Creates a new handler by executing the provided middleware functions from
 * first to last.
 *
 * Each middleware receives the handler returned by the next middleware in the
 * chain, allowing behaviour to be layered transparently.
 *
 * @param middlewares Ordered list of middleware to apply.
 * @returns A {@link RouteMiddleware} that runs the chain.
 */
export function createMiddlewareChain(middlewares: RouteMiddleware[]): RouteMiddleware {
  return middlewares.reduceRight<RouteMiddleware>(
    (next, mw) => (handler) => mw(next(handler)),
    (handler) => handler
  );
}

/**
 * Adapter turning {@link withErrorHandling} into a {@link RouteMiddleware}.
 */
export function errorHandlingMiddleware(): RouteMiddleware {
  return (handler: RouteHandler): RouteHandler =>
    (req: NextRequest, ctx?: any, data?: any) =>
      withErrorHandling((r) => handler(r, ctx, data), req);
}

/**
 * Adapter turning {@link withRouteAuth} into a {@link RouteMiddleware}.
 *
 * @param options Options forwarded to {@link withRouteAuth}.
 */
export function routeAuthMiddleware(options?: RouteAuthOptions): RouteMiddleware {
  return (handler: RouteHandler): RouteHandler =>
    (req: NextRequest, _ctx?: any, data?: any) =>
      withRouteAuth((r, authCtx) => handler(r, authCtx, data), req, options);
}

/**
 * Adapter turning {@link withValidation} into a {@link RouteMiddleware}.
 *
 * @param schema Zod schema used to validate the request body or provided data.
 */
export function validationMiddleware<T>(schema: ZodSchema<T>): RouteMiddleware {
  return (handler: RouteHandler): RouteHandler =>
    (req: NextRequest, ctx?: any) =>
      withValidation(schema, (r, data) => handler(r, ctx, data), req);
}

/**
 * Adapter turning {@link createRateLimit} into a {@link RouteMiddleware}.
 *
 * @param options Optional configuration for the rate limiter.
 */
export function rateLimitMiddleware(
  options?: RateLimitOptions
): RouteMiddleware {
  const limiter = createRateLimit(options);
  return (handler: RouteHandler): RouteHandler =>
    (req: NextRequest, ctx?: any, data?: any) =>
      limiter(req, (r) => handler(r, ctx, data));
}

/**
 * Builds a middleware chain based on a configuration object.
 * The configuration is validated using {@link middlewareConfigSchema}.
 */
export function createMiddlewareChainFromConfig(
  config: Partial<MiddlewareConfig> = {},
  routeType: ApiRouteType = 'public'
): RouteMiddleware {
  const defaults = getDefaultMiddlewareConfig(routeType);
  const cfg = middlewareConfigSchema.parse({ ...defaults, ...config });
  const mws: RouteMiddleware[] = [];

  if (cfg.errorHandling) {
    mws.push(errorHandlingMiddleware());
  }
  if (cfg.auth) {
    mws.push(routeAuthMiddleware(cfg.auth));
  }
  if (cfg.validationSchema) {
    mws.push(validationMiddleware(cfg.validationSchema));
  }
  if (cfg.rateLimit) {
    mws.push(rateLimitMiddleware(cfg.rateLimit));
  }

  return createMiddlewareChain(mws);
}

/**
 * Standard middleware composition for authenticated API routes.
 * Applies rate limiting, error handling, authentication and
 * optional request validation in that order.
 */
export const standardApiMiddleware = <T>(
  schema: ZodSchema<T>
): RouteMiddleware =>
  createMiddlewareChain([
    rateLimitMiddleware(),
    errorHandlingMiddleware(),
    routeAuthMiddleware(),
    validationMiddleware(schema)
  ]);
