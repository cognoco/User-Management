import { describe, it, expect, beforeEach } from 'vitest';
import { SupabaseAuthProvider } from '../providers/supabase-auth-provider';
import { supabase, resetSupabaseMock } from '@/tests/mocks/supabase';
import type { LoginPayload, RegistrationPayload } from '@/core/auth/models';

const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321';
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'test-anon-key';

describe('SupabaseAuthProvider', () => {
  beforeEach(() => {
    resetSupabaseMock();
  });

  it('logs in a user using Supabase', async () => {
    const provider = new SupabaseAuthProvider(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const credentials: LoginPayload = { email: 'test@example.com', password: 'pw' };

    const result = await provider.login(credentials);

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'test@example.com', password: 'pw' });
    expect(result.success).toBe(true);
    expect(result.user?.id).toBe('user-123');
  });

  it('registers a user using Supabase', async () => {
    const provider = new SupabaseAuthProvider(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const payload: RegistrationPayload = {
      email: 'new@example.com',
      password: 'pw',
      firstName: 'New',
      lastName: 'User'
    };

    const result = await provider.register(payload);

    expect(supabase.auth.signUp).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.user?.id).toBe('user-123');
  });
});
