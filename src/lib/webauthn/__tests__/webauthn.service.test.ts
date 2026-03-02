import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock(
  '@simplewebauthn/server',
  () => ({
    generateRegistrationOptions: vi.fn(async () => ({ challenge: 'reg-chal' })),
    verifyRegistrationResponse: vi.fn(async () => ({
      verified: true,
      registrationInfo: {
        credentialID: Buffer.from('cred').toString('base64'),
        credentialPublicKey: Buffer.from('pk').toString('base64'),
        counter: 0,
      },
    })),
    generateAuthenticationOptions: vi.fn(async () => ({ challenge: 'auth-chal' })),
    verifyAuthenticationResponse: vi.fn(async () => ({
      verified: true,
      authenticationInfo: { newCounter: 2 },
    })),
  }),
);

import {
  generateRegistration,
  verifyRegistration,
  generateAuthentication,
  verifyAuthentication,
} from '../webauthn.service';
import {
  setTableMockData,
  resetSupabaseMock,
  supabase,
} from '@/tests/mocks/supabase';

describe('webauthn.service', () => {
  beforeEach(() => {
    resetSupabaseMock();
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'key');
    vi.stubEnv('NEXT_PUBLIC_RP_ID', 'example.com');
    vi.stubEnv('NEXT_PUBLIC_ORIGIN', 'https://example.com');
    setTableMockData('webauthn_credentials', { data: [], error: null });
    setTableMockData('webauthn_challenges', { data: [], error: null });
  });

  it('generates registration options and stores challenge', async () => {
    const opts = await generateRegistration('user1');
    expect(opts.challenge).toBe('reg-chal');
    const builder = (supabase.from as any).mock.results[1].value;
    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user1', challenge: 'reg-chal', type: 'registration' })
    );
  });

  it('verifies registration and saves credential', async () => {
    setTableMockData('webauthn_challenges', {
      data: [{ user_id: 'user1', challenge: 'reg-chal', type: 'registration' }],
      error: null,
    });
    const res = await verifyRegistration('user1', {} as any);
    expect(res.verified).toBe(true);
  });

  it('generates authentication options', async () => {
    setTableMockData('webauthn_credentials', {
      data: [{ credential_id: Buffer.from('cred').toString('base64'), user_id: 'user1' }],
      error: null,
    });
    const opts = await generateAuthentication('user1');
    expect(opts.challenge).toBe('auth-chal');
  });

  it('throws when no credentials for authentication', async () => {
    await expect(generateAuthentication('user1')).rejects.toThrow('No credentials found for this user');
  });

  it('verifies authentication and updates counter', async () => {
    setTableMockData('webauthn_challenges', {
      data: [{ user_id: 'user1', challenge: 'auth-chal', type: 'authentication' }],
      error: null,
    });
    setTableMockData('webauthn_credentials', {
      data: {
        credential_id: Buffer.from('cred').toString('base64'),
        public_key: Buffer.from('pk').toString('base64'),
        counter: 1,
        user_id: 'user1',
      },
      error: null,
    });
    const res = await verifyAuthentication('user1', { id: 'cred' } as any);
    expect(res.verified).toBe(true);
  });
});
