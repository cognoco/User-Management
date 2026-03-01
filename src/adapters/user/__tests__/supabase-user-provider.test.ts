import { describe, it, expect, beforeEach } from 'vitest';
import { SupabaseUserProvider } from '../supabase-user-provider';
import { setTableMockData, resetSupabaseMock } from '@/tests/mocks/supabase';

const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321';
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'test-anon-key';

const sampleProfile = {
  user_id: 'user-1',
  email: 'user@example.com',
  first_name: 'Test',
  last_name: 'User',
  display_name: 'Tester',
  bio: 'bio',
  location: 'here',
  website: 'https://example.com',
  avatar_url: 'https://example.com/avatar.png',
  is_active: true,
  account_type: 'personal',
  account_data: {},
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-02T00:00:00Z',
  deactivated_at: null,
  deactivation_reason: null
};

describe('SupabaseUserProvider', () => {
  beforeEach(() => {
    resetSupabaseMock();
    setTableMockData('profiles', { data: [sampleProfile], error: null });
  });

  it('retrieves a user profile', async () => {
    const provider = new SupabaseUserProvider(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const result = await provider.getUserProfile('user-1');

    expect(result).toEqual({
      userId: 'user-1',
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      displayName: 'Tester',
      bio: 'bio',
      location: 'here',
      website: 'https://example.com',
      avatarUrl: 'https://example.com/avatar.png',
      isActive: true,
      accountType: 'personal',
      accountData: {},
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-02T00:00:00Z'),
      deactivatedAt: null,
      deactivationReason: null
    });
  });
});
