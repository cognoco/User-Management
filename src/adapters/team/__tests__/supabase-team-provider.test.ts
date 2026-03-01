import { describe, it, expect, beforeEach } from 'vitest';
import { SupabaseTeamProvider } from '../supabase-team-provider';
import { setTableMockData, resetSupabaseMock } from '@/tests/mocks/supabase';

const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321';
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'test-anon-key';

const teamRecord = {
  id: 'team-1',
  name: 'Team 1',
  description: 'Desc',
  owner_id: 'user-1',
  is_public: false,
  settings: {},
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-02T00:00:00Z'
};

describe('SupabaseTeamProvider', () => {
  beforeEach(() => {
    resetSupabaseMock();
    setTableMockData('teams', { data: [teamRecord], error: null });
  });

  it('retrieves a team by id', async () => {
    const provider = new SupabaseTeamProvider(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const result = await provider.getTeam('team-1');

    expect(result).toEqual({
      id: 'team-1',
      name: 'Team 1',
      description: 'Desc',
      ownerId: 'user-1',
      isPublic: false,
      settings: {},
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-02T00:00:00Z')
    });
  });
});
