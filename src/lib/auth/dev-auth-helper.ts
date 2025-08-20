/**
 * Development auth helper to bypass email confirmation
 */
import { createClient } from '@supabase/supabase-js';

const isDevelopment = process.env.NODE_ENV === 'development';

export async function createUserWithAutoConfirm(
  email: string,
  password: string,
  metadata?: Record<string, any>
) {
  if (!isDevelopment) {
    throw new Error('Auto-confirm is only available in development');
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service credentials');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Create user with admin API (bypasses email confirmation)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email
    user_metadata: metadata || {}
  });

  if (error) {
    throw error;
  }

  return data.user;
}