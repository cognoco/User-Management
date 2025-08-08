import { createClient } from '@supabase/supabase-js';
// Keep this import if config is used elsewhere, but we won't use the object here
// import { supabaseConfig } from '@/lib/config'; 

// Lazy initialization to avoid module-load-time environment variable issues
let _supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!_supabaseClient) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Supabase environment variables are not configured properly');
      throw new Error('Supabase configuration missing');
    }
    
    _supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return _supabaseClient;
}

// Export getter instead of direct client
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

/**
 * Create a Supabase client instance
 * This function is used by the app-init.ts file
 */
export function createSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Supabase environment variables are not configured properly');
    throw new Error('Supabase configuration missing');
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Get a Supabase instance with the service role key for admin operations (Server-side)
export function getServiceSupabase() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set. Backend operations requiring admin privileges will fail.');
    
    // In test environment, return a mock instead of throwing
    if (process.env.NODE_ENV === 'test' || process.env.PLAYWRIGHT_TEST_BASE_URL) {
      console.warn('Test environment detected, returning mock Supabase service client');
      return {
        auth: {
          admin: {
            createUser: () => Promise.resolve({ data: { user: { id: 'mock-user' } }, error: null }),
            updateUserById: () => Promise.resolve({ data: { user: { id: 'mock-user' } }, error: null }),
            deleteUser: () => Promise.resolve({ data: {}, error: null }),
          }
        }
      } as any;
    }
    
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
     throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured.');
  }

  // Ensure service client is only created once per request lifecycle if needed, or manage scope appropriately.
  // For simple API routes, creating it on demand might be okay.
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export { createClient };

