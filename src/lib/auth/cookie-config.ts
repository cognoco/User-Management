import { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

/**
 * Secure cookie configuration for authentication and sessions
 * Implements httpOnly, secure, and sameSite attributes for security
 */

export const AUTH_COOKIE_NAME = 'auth-token';
export const SESSION_COOKIE_NAME = 'session-id';
export const CSRF_COOKIE_NAME = 'csrf-token';

/**
 * Get secure cookie configuration based on environment
 * @param isProd - Whether running in production
 * @returns Cookie configuration with security attributes
 */
export const getCookieConfig = (isProd: boolean = process.env.NODE_ENV === 'production'): Partial<ResponseCookie> => ({
  httpOnly: true,
  secure: isProd,
  sameSite: 'strict',
  path: '/',
  maxAge: 60 * 60 * 24 * 7 // 7 days
});

/**
 * Create a secure cookie with proper security attributes
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Additional cookie options
 * @returns Cookie configuration object
 */
export const setSecureCookie = (
  name: string,
  value: string,
  options?: Partial<ResponseCookie>
): ResponseCookie => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    name,
    value,
    ...getCookieConfig(isProd),
    ...options
  } as ResponseCookie;
};

/**
 * Get cookie options for Next.js cookies() helper
 * @returns Cookie options with security attributes
 */
export const getNextCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  };
};

/**
 * Cookie names used throughout the application
 */
export const COOKIE_NAMES = {
  AUTH_TOKEN: 'auth-token',
  SESSION_ID: 'session-id',
  CSRF_TOKEN: 'csrf-token',
  REMEMBER_ME: 'remember-me',
  MFA_PENDING: 'mfa-pending'
} as const;

/**
 * Cookie expiration times in seconds
 */
export const COOKIE_EXPIRY = {
  DEFAULT: 60 * 60 * 24 * 7, // 7 days
  REMEMBER_ME: 60 * 60 * 24 * 30, // 30 days
  SESSION: 60 * 60 * 8, // 8 hours
  MFA_PENDING: 60 * 10 // 10 minutes for MFA verification
} as const;