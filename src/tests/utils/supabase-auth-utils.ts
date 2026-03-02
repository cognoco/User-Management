// src/tests/utils/supabase-auth-utils.ts
// Utility helpers for Supabase authentication in tests

import { vi, Mock } from 'vitest';
import type { User, Session } from '@supabase/auth-js';
import { AuthError } from '@supabase/auth-js';
import { supabase } from '@/tests/mocks/supabase';

/**
 * Generate a lightweight JWT-like string for tests.
 * This does not perform real signing and should NEVER be used in production.
 */
export function generateTestJwt(payload: Record<string, unknown> = {}): string {
  const base = {
    sub: 'test-user',
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
    ...payload,
  };
  return Buffer.from(JSON.stringify(base)).toString('base64');
}

/**
 * Create a mock Supabase user with optional overrides.
 */
export function createMockSupabaseUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    email: 'user@example.com',
    role: 'authenticated',
    app_metadata: { role: 'user' },
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    ...overrides,
  } as User;
}

/**
 * Create a mock Supabase session for the given user.
 */
export function createMockSupabaseSession(
  user: User = createMockSupabaseUser(),
  overrides: Partial<Session> = {}
): Session {
  return {
    access_token: 'test-token',
    token_type: 'bearer',
    user,
    refresh_token: 'refresh-token',
    expires_in: 3600,
    provider_token: null,
    provider_refresh_token: null,
    ...overrides,
  } as Session;
}

/**
 * Mock the Supabase client to return a user with the given role.
 */
export function mockSupabaseUserRole(
  role: string,
  overrides: Partial<User> = {}
): User {
  const user = createMockSupabaseUser({ app_metadata: { role }, ...overrides });
  (supabase.auth.getUser as Mock).mockResolvedValue({ data: { user }, error: null });
  return user;
}

/**
 * Force `supabase.auth.getUser` to return an authentication error.
 */
export function mockAuthError(message = 'Invalid token'): AuthError {
  const error = new AuthError(message);
  (supabase.auth.getUser as Mock).mockResolvedValue({ data: { user: null }, error });
  return error;
}

/**
 * Shortcut for simulating an expired token error.
 */
export function mockExpiredToken() {
  return mockAuthError('Token expired');
}
