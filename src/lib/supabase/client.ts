/**
 * Singleton Supabase Client
 * 
 * This module provides a singleton Supabase client to ensure only one instance
 * is created throughout the application, preventing the "Multiple GoTrueClient 
 * instances detected" warning and potential undefined behavior.
 */

import { createBrowserClient, type SupabaseClient } from '@supabase/ssr';
import { createClient as createServerClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;
let serverClient: SupabaseClient | null = null;

/**
 * Get the singleton browser Supabase client
 * This should be used in client-side components and hooks
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    browserClient = createBrowserClient(supabaseUrl, supabaseKey, {
      cookies: {
        get: (name: string) => {
          if (typeof window === 'undefined') return undefined;
          return document.cookie
            .split('; ')
            .find(row => row.startsWith(`${name}=`))
            ?.split('=')[1];
        },
        set: (name: string, value: string, options: any) => {
          if (typeof window === 'undefined') return;
          document.cookie = `${name}=${value}; path=/; ${options?.maxAge ? `max-age=${options.maxAge};` : ''}`;
        },
        remove: (name: string, options: any) => {
          if (typeof window === 'undefined') return;
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
        },
      },
    });
  }

  return browserClient;
}

/**
 * Get the singleton server Supabase client
 * This should be used in server-side code (API routes, middleware, etc.)
 */
export function getSupabaseServerClient(): SupabaseClient {
  if (!serverClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    serverClient = createServerClient(supabaseUrl, supabaseKey);
  }

  return serverClient;
}

/**
 * Get the appropriate Supabase client based on environment
 * Automatically detects if running in browser or server context
 */
export function getSupabaseClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    return getSupabaseBrowserClient();
  } else {
    return getSupabaseServerClient();
  }
}

/**
 * Reset the singleton clients (useful for testing)
 */
export function resetSupabaseClients(): void {
  browserClient = null;
  serverClient = null;
}