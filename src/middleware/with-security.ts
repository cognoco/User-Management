import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

const securityHeaders = {
  'Content-Security-Policy': 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob: https:; " +
    "font-src 'self'; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "frame-ancestors 'none'; " +
    "block-all-mixed-content; " +
    "upgrade-insecure-requests;",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
};

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * Middleware that adds security headers and other security measures
 * @param handler The route handler to wrap
 * @param options Configuration options
 */
export function withSecurity(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: { skipCSRF?: boolean } = {}
) {
  return async function securityMiddleware(
    request: NextRequest
  ): Promise<NextResponse> {
    try {
      // Check CSRF protection BEFORE processing the request for mutating methods
      if (!options.skipCSRF && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
        const csrfToken = request.headers.get('X-CSRF-Token');
        const storedToken = request.cookies.get('csrf-token')?.value;

        if (!csrfToken || !storedToken || !safeEqual(csrfToken, storedToken)) {
          return new NextResponse(
            JSON.stringify({ error: 'Invalid CSRF token' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // Get the response from the handler
      const response = await handler(request);

      // Add security headers
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error) {
      console.error('Security middleware error:', error);
      return new NextResponse(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
} 