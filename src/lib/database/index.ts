// Server-only Supabase client factory; do not import from client bundles
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Ensure you have these environment variables set in your .env file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}
if (!supabaseAnonKey) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Create and export the Supabase client instance
// We use <any, 'public'> for Database, SchemaName generics as we don't have generated types setup here yet.
// Ideally, replace 'any' with generated types later.
export const supabase: SupabaseClient<any, 'public'> = createClient<any, 'public'>(supabaseUrl, supabaseAnonKey);

// Optional: Export the provider class if needed elsewhere, though the client instance is often sufficient
// export { SupabaseProvider } from './providers/supabase'; 