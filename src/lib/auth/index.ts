import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { CurrentSession } from './session';
import {
  getCurrentSession,
  getCurrentUser as sessionGetCurrentUser,
  getSessionFromRequest,
  isSessionValid,
  refreshSession,
  handleSessionTimeout,
  persistSession,
} from './session';
import {
  extractAuthToken,
  validateAuthToken,
  verifyEmailToken,
  getUserFromRequest,
  type AuthenticatedUser,
} from './utils';

// Export an empty object to satisfy existing imports while the codebase
// migrates away from NextAuth. Supabase is now used for authentication.
/**
 * Placeholder export maintained for backward compatibility with legacy
 * NextAuth based code paths. The object is intentionally empty because the
 * module now relies solely on Supabase for authentication.
 */
export const authOptions: Record<string, never> = {};

/**
 * Create a Supabase client configured with the current request cookies.
 */
export async function getSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
      },
    }
  );
}

/**
 * Sign the current user out of Supabase.
 */
export async function signOut(): Promise<void> {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
}

/**
 * Retrieve the current authentication session.
 */
export async function getSession(): Promise<CurrentSession | null> {
  return getCurrentSession();
}

/**
 * Resolve the authenticated user from the current session.
 */
export async function getCurrentUser() {
  return sessionGetCurrentUser();
}

/**
 * Convenience helper that returns only the authenticated user id.
 */
export async function getUserId(): Promise<string | null> {
  const user = await sessionGetCurrentUser();
  return user?.id ?? null;
}

export {
  // Session helpers
  getCurrentSession,
  getSessionFromRequest,
  isSessionValid,
  refreshSession,
  handleSessionTimeout,
  persistSession,
  // Token utilities
  extractAuthToken,
  validateAuthToken,
  verifyEmailToken,
  getUserFromRequest,
};

export type { CurrentSession, AuthenticatedUser };

export * from './supabase-auth.config';
export { initializeSupabaseAuth } from './initialize-supabase-auth';
