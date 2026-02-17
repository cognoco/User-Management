import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Session } from '@supabase/auth-js';

/**
 * Supabase authentication configuration.
 *
 * This replaces the old NextAuth based configuration. During migration we keep
 * the legacy `SESSION_COOKIE_NAME` environment variable so existing sessions
 * remain valid. Remove `legacySessionCookie` once the migration is complete.
 */
export const supabaseAuthConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  /**
   * @deprecated Used only to support cookies created by the previous NextAuth
   * implementation. New installations should ignore this setting.
   */
  legacySessionCookie:
    process.env.SESSION_COOKIE_NAME || 'user-management-session',
} as const;

/**
 * Retrieve the current Supabase session on the server.
 *
 * The function uses the request cookies to create a Supabase client and
 * returns the active session if one exists.
 */
export async function auth(): Promise<Session | null> {
  const cookieStore = cookies();

  const supabase = createServerClient(
    supabaseAuthConfig.url,
    supabaseAuthConfig.anonKey,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
      },
    }
  );

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Error retrieving session:', error);
    return null;
  }

  return data.session;
}

// ---------------------------------------------------------------------------
// Legacy export kept so existing imports referencing NextAuth configuration do
// not break immediately. Remove in the next major version.
// ---------------------------------------------------------------------------
export const authOptions = {};
