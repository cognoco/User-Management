import { cookies } from 'next/headers';
import { createServerClient, type Session } from '@supabase/ssr';

/**
 * Retrieve the current Supabase session on the server.
 *
 * The function uses the request cookies to create a Supabase client and
 * returns the active session if one exists.
 */
export async function auth(): Promise<Session | null> {
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

  if (error) {
    console.error('Error retrieving session:', error);
    return null;
  }

  return data.session;
}
