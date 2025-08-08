// Use dynamic import guarded to server only; never bundle supabase-js in client
export async function getSupabaseClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Supabase client is server-only in this app. Use API routes from the client.');
  }
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, supabaseAnonKey);
}