/**
 * Supabase Authentication Configuration
 *
 * This module defines the configuration options used when initializing
 * Supabase authentication clients. Environment variables are read and
 * validated when this file is imported.
 *
 * Available options and their environment variable mappings:
 * - `url`  (`NEXT_PUBLIC_SUPABASE_URL`)       : Supabase project URL (required)
 * - `anonKey` (`NEXT_PUBLIC_SUPABASE_ANON_KEY`): Public anonymous key (required)
 * - `serviceRoleKey` (`SUPABASE_SERVICE_ROLE_KEY`): Service role key for server
 *   side operations (required only on the server)
 * - `cookieName` (`SUPABASE_AUTH_COOKIE_NAME`): Name of the cookie storing the
 *   access token. Defaults to `sb-access-token`.
 * - `cookieLifetimeDays` (`SUPABASE_AUTH_COOKIE_LIFETIME_DAYS`): Lifetime of the
 *   auth cookie in days. Defaults to `7`.
 * - `autoRefreshToken` (`SUPABASE_AUTO_REFRESH_TOKEN`): Whether the client
 *   should automatically refresh the session. Defaults to `true`.
 * - `persistSession` (`SUPABASE_PERSIST_SESSION`): Whether the client should
 *   persist the session across tabs. Defaults to `true`.
 */

export interface SupabaseAuthConfig {
  /** Supabase project URL */
  url: string;
  /** Public anon key used by the browser */
  anonKey: string;
  /** Service role key for privileged server operations */
  serviceRoleKey?: string;
  /** Cookie name used to store the access token */
  cookieName: string;
  /** Cookie lifetime in days */
  cookieLifetimeDays: number;
  /** Automatically refresh session tokens */
  autoRefreshToken: boolean;
  /** Persist session across browser tabs */
  persistSession: boolean;
}

/** Supabase auth configuration derived from environment variables */
export const supabaseAuthConfig: SupabaseAuthConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  cookieName: process.env.SUPABASE_AUTH_COOKIE_NAME || 'sb-access-token',
  cookieLifetimeDays: parseInt(
    process.env.SUPABASE_AUTH_COOKIE_LIFETIME_DAYS || '7',
    10
  ),
  autoRefreshToken:
    process.env.SUPABASE_AUTO_REFRESH_TOKEN !== 'false',
  persistSession: process.env.SUPABASE_PERSIST_SESSION !== 'false',
};

/**
 * Validate the current configuration. Logs missing variables and returns
 * `true` when the configuration is complete.
 */
export function validateSupabaseAuthConfig(
  config: SupabaseAuthConfig = supabaseAuthConfig
): boolean {
  const required = [
    { name: 'NEXT_PUBLIC_SUPABASE_URL', value: config.url },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: config.anonKey },
  ];

  if (typeof window === 'undefined') {
    required.push({ name: 'SUPABASE_SERVICE_ROLE_KEY', value: config.serviceRoleKey ?? '' });
  }

  const missing = required.filter(v => !v.value).map(v => v.name);
  if (missing.length > 0) {
    console.error(
      `[supabase-auth-config] Missing required environment variables: ${missing.join(', ')}`
    );
    return false;
  }

  return true;
}

// Validate immediately unless running tests
if (process.env.NODE_ENV !== 'test') {
  validateSupabaseAuthConfig();
}
