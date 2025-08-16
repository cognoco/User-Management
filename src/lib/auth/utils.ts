import { NextRequest } from 'next/server';
import { getServiceSupabase } from '@/lib/database/supabase';
import { debug, info, warn, error as logError } from '@/lib/utils/logger';

/**
 * Object representing an authenticated user returned by utilities in this file.
 */
export interface AuthenticatedUser {
  id: string;
  email: string | null;
  role: string;
}

/**
 * Validate a raw authentication token using Supabase.
 *
 * @param token Authentication bearer token
 * @returns The authenticated user or null when invalid
 */
export async function validateAuthToken(token: string): Promise<AuthenticatedUser | null> {
  if (!token) return null;
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return {
      id: data.user.id,
      email: data.user.email ?? null,
      role: data.user.user_metadata?.role || 'user',
    };
  } catch (err) {
    console.error('[auth] token validation failed:', err);
    return null;
  }
}

/**
 * Extract the bearer token from a request.
 *
 * The function checks the `Authorization` header first and falls back to the
 * `sb-access-token` cookie. Both `Bearer <token>` and raw token formats are
 * supported for backwards compatibility.
 */
export function extractAuthToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization') || '';
  let token = '';

  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (authHeader) {
    token = authHeader.trim();
  } else {
    token = req.cookies.get('sb-access-token')?.value || '';
  }

  const finalToken = token || null;
  debug('auth', 'Token extraction result', { tokenPresent: !!finalToken });
  return finalToken;
}

/**
 * Get the current user from a request
 * @param req The Next.js request object
 * @returns The user object or null if not authenticated
 */
export async function getUserFromRequest(
  req: NextRequest
): Promise<AuthenticatedUser | null> {
  try {
    const token = extractAuthToken(req);
    if (!token) {
      debug('auth', 'No token provided in request');
      return null;
    }

    const user = await validateAuthToken(token);
    if (user) {
      info('auth', 'User authenticated successfully', { userId: user.id });
    } else {
      warn('auth', 'Invalid authentication token provided');
    }
    return user;
  } catch (error) {
    logError('auth', 'Failed to get user from request', error as Error);
    return null;
  }
}

/**
 * Verify an email verification token
 * @param token The email verification token to verify
 * @returns The user ID if valid, null otherwise
 */
export async function verifyEmailToken(token: string): Promise<string | null> {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('email_verification')
      .select('user_id, expires_at')
      .eq('token', token)
      .single();

    if (error || !data) {
      logError('auth', 'Email token lookup failed', error as Error);
      return null;
    }

    const expiresAt = new Date(data.expires_at);
    if (Date.now() > expiresAt.getTime()) {
      info('auth', 'Email verification token expired');
      return null;
    }

    info('auth', 'Email verification token valid', { userId: data.user_id });
    return data.user_id;
  } catch (error) {
    logError('auth', 'Error verifying email token', error as Error);
    return null;
  }
}
