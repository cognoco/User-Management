import type { RouteMiddleware, RouteHandler } from '@/middleware/createMiddlewareChain';
import { createMiddlewareChain } from '@/middleware/createMiddlewareChain';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Helper to execute a set of middlewares with a handler for testing.
 * @param middlewares Middleware functions to run.
 * @param handler Final route handler.
 * @param req Request to pass to the chain.
 * @param ctx Optional context passed to the handler.
 */
export async function runMiddlewareChain(
  middlewares: RouteMiddleware[],
  handler: RouteHandler,
  req: NextRequest,
  ctx?: any
) {
  const chain = createMiddlewareChain(middlewares);
  return chain(handler)(req, ctx);
}

/**
 * Creates a mock handler that resolves with a JSON response.
 * @param status HTTP status to return.
 * @param body Optional JSON body.
 */
export function createJsonHandler(status = 200, body: unknown = null): RouteHandler {
  return async () => NextResponse.json(body, { status });
}
