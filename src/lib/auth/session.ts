/**
 * Server-side helpers for managing Supabase authentication sessions.
 */
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import type { Session } from '@supabase/supabase-js';
import { getApiAuthService } from '@/services/auth/factory';
import { authConfig, isProduction } from './config';
import { extractAuthToken, validateAuthToken } from './utils';
import { debug, info, warn, error as logError } from '@/lib/utils/logger';

/**
 * Shape of the session object returned by helpers in this module.
 */
export interface CurrentSession {
  /** Supabase user identifier */
  userId: string;
  /** User email */
  email: string;
  /** User role if provided */
  role: string;
  /** Access token */
  accessToken: string;
  /** Refresh token if available */
  refreshToken?: string;
  /** Expiration timestamp in milliseconds */
  expiresAt: number;
}

/**
 * Retrieve the current user session from Supabase cookies.
 *
 * @returns The active {@link CurrentSession} or `null` when no valid session
 *   exists.
 */
export async function getCurrentSession(): Promise<CurrentSession | null> {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
        },
      }
    );

    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      return null;
    }

    const { session } = data;

    return {
      userId: session.user.id,
      email: session.user.email ?? '',
      role: (session.user.role as string) ?? 'user',
      accessToken: session.access_token,
      refreshToken: session.refresh_token ?? undefined,
      expiresAt: session.expires_at * 1000,
    };
  } catch (error) {
    logError('session', 'Failed to get current session', error as Error);
    return null;
  }
}

/**
 * Determine whether the current session is valid.
 */
export async function isSessionValid(): Promise<boolean> {
  const session = await getCurrentSession();
  return !!session && session.expiresAt > Date.now();
}

/**
 * Refresh the current session token using the configured AuthService.
 *
 * @returns The refreshed session or `null` if refresh failed.
 */
export async function refreshSession(): Promise<CurrentSession | null> {
  try {
    const authService = getApiAuthService();
    const ok = await authService.refreshToken();
    if (!ok) {
      warn('session', 'Token refresh failed');
      return null;
    }

    info('session', 'Token refreshed successfully');
    return getCurrentSession();
  } catch (error) {
    logError('session', 'Error refreshing session', error as Error);
    return null;
  }
}

/**
 * Handle session timeout by delegating to the AuthService.
 */
export function handleSessionTimeout(): void {
  try {
    getApiAuthService().handleSessionTimeout();
    debug('session', 'Session timeout handled');
  } catch (error) {
    logError('session', 'Failed to handle session timeout', error as Error);
  }
}

/**
 * Persist or clear the session access token cookie.
 */
export function persistSession(session: Session | null): void {
  try {
    const cookieStore = cookies();
    const name = authConfig.sessionCookieName;

    if (session) {
      cookieStore.set({
        name,
        value: session.access_token,
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        path: '/',
        maxAge: session.expires_in,
      });
      debug('session', 'Session persisted to cookie');
    } else {
      cookieStore.delete(name);
      debug('session', 'Session cookie cleared');
    }
  } catch (error) {
    logError('session', 'Failed to persist session', error as Error);
  }
}

/**
 * Convenience helper to retrieve the current user from the session.
 */
export async function getCurrentUser() {
  const session = await getCurrentSession();

  if (!session) return null;

  return {
    id: session.userId,
    email: session.email,
    role: session.role,
  };
}

/**
 * Resolve the authenticated user from a Next.js request using the Authorization header
 */
export async function getSessionFromRequest(req: NextRequest): Promise<CurrentSession | null> {
  const token = extractAuthToken(req);
  if (!token) return null;
  const user = await validateAuthToken(token);
  if (!user) return null;
  return {
    userId: user.id,
    email: user.email ?? '',
    role: user.role,
    accessToken: token,
    expiresAt: Date.now() + authConfig.tokenExpiryDays * 24 * 60 * 60 * 1000,
  };
}
