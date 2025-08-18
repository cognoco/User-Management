import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { timingSafeEqual } from 'crypto';

/**
 * CSRF Protection wrapper for Next.js App Router API routes
 * Validates CSRF tokens on state-changing requests (POST, PUT, DELETE, PATCH)
 */

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const EXCLUDED_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Safely compare two strings in constant time to prevent timing attacks
 */
function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * Extract CSRF token from request headers
 */
function getHeaderToken(request: NextRequest): string | null {
  return request.headers.get(CSRF_HEADER_NAME) || 
         request.headers.get('X-CSRF-Token') || 
         request.headers.get('csrf-token') ||
         null;
}

/**
 * Extract CSRF token from cookies
 */
async function getCookieToken(): Promise<string | null> {
  const cookieStore = cookies();
  const csrfCookie = cookieStore.get(CSRF_COOKIE_NAME);
  return csrfCookie?.value || null;
}

/**
 * Validate CSRF token for the request
 */
async function validateCSRF(request: NextRequest): Promise<boolean> {
  // Skip validation for safe methods
  if (EXCLUDED_METHODS.includes(request.method)) {
    return true;
  }

  const cookieToken = await getCookieToken();
  const headerToken = getHeaderToken(request);

  // Both tokens must exist and match
  if (!cookieToken || !headerToken) {
    return false;
  }

  return safeEqual(cookieToken, headerToken);
}

/**
 * Type for API route handlers
 */
type RouteHandler = (
  request: NextRequest,
  context?: any
) => Promise<NextResponse> | NextResponse;

/**
 * Wrap an API route handler with CSRF protection
 * 
 * @example
 * ```typescript
 * // app/api/profile/route.ts
 * import { withCSRF } from '@/lib/api/csrf-wrapper';
 * 
 * export const POST = withCSRF(async (request) => {
 *   // Your handler code here
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withCSRF(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, context?: any) => {
    // Validate CSRF token
    const isValid = await validateCSRF(request);
    
    if (!isValid) {
      return NextResponse.json(
        { 
          error: 'Invalid or missing CSRF token',
          code: 'CSRF_VALIDATION_FAILED'
        },
        { status: 403 }
      );
    }

    // Call the original handler
    return handler(request, context);
  };
}

/**
 * Higher-order function to create wrapped handlers for all methods
 * 
 * @example
 * ```typescript
 * // app/api/profile/route.ts
 * import { createCSRFHandlers } from '@/lib/api/csrf-wrapper';
 * 
 * const handlers = createCSRFHandlers({
 *   async POST(request) {
 *     // Handle POST
 *   },
 *   async PUT(request) {
 *     // Handle PUT
 *   },
 *   async DELETE(request) {
 *     // Handle DELETE
 *   }
 * });
 * 
 * export const { POST, PUT, DELETE } = handlers;
 * ```
 */
export function createCSRFHandlers(handlers: Record<string, RouteHandler>) {
  const wrappedHandlers: Record<string, RouteHandler> = {};
  
  for (const [method, handler] of Object.entries(handlers)) {
    // Only wrap state-changing methods
    if (EXCLUDED_METHODS.includes(method)) {
      wrappedHandlers[method] = handler;
    } else {
      wrappedHandlers[method] = withCSRF(handler);
    }
  }
  
  return wrappedHandlers;
}

/**
 * Middleware function for use in middleware.ts
 * Can be used to validate CSRF on all routes matching a pattern
 */
export async function csrfMiddleware(request: NextRequest) {
  // Skip validation for safe methods
  if (EXCLUDED_METHODS.includes(request.method)) {
    return NextResponse.next();
  }

  const isValid = await validateCSRF(request);
  
  if (!isValid) {
    return NextResponse.json(
      { 
        error: 'Invalid or missing CSRF token',
        code: 'CSRF_VALIDATION_FAILED'
      },
      { status: 403 }
    );
  }

  return NextResponse.next();
}