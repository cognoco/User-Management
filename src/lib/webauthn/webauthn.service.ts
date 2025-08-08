// Server-only: dynamically import simplewebauthn in functions to avoid eager bundling
import type {
  RegistrationCredentialJSON,
  AuthenticationCredentialJSON,
} from '@simplewebauthn/types';
import { getServiceSupabase } from '@/lib/database/supabase';

const rpName = 'User Management System';
const rpID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';
const origin = process.env.NEXT_PUBLIC_ORIGIN || `https://${rpID}`;

export async function generateRegistration(userId: string) {
  const {
    generateRegistrationOptions,
  } = await import('@simplewebauthn/server');
  const supabase = getServiceSupabase();

  const { data: existingCredentials } = await supabase
    .from('webauthn_credentials')
    .select('credential_id, public_key')
    .eq('user_id', userId);

  const excludeCredentials =
    existingCredentials?.map((cred: any) => ({
      id: Buffer.from(cred.credential_id, 'base64'),
      type: 'public-key',
    })) || [];

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: userId,
    attestationType: 'none',
    excludeCredentials,
    authenticatorSelection: {
      userVerification: 'preferred',
      residentKey: 'preferred',
    },
  });

  await supabase.from('webauthn_challenges').upsert({
    user_id: userId,
    challenge: options.challenge,
    expires_at: new Date(Date.now() + 5 * 60 * 1000),
    type: 'registration',
  });

  return options;
}

export async function verifyRegistration(
  userId: string,
  credential: RegistrationCredentialJSON,
) {
  const { verifyRegistrationResponse } = await import('@simplewebauthn/server');
  const supabase = getServiceSupabase();

  const { data: challengeData, error: challengeError } = await supabase
    .from('webauthn_challenges')
    .select('challenge')
    .eq('user_id', userId)
    .eq('type', 'registration')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (challengeError || !challengeData) {
    throw new Error('Challenge not found or expired');
  }

  const verification = await verifyRegistrationResponse({
    credential,
    expectedChallenge: challengeData.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('Verification failed');
  }

  const { error: credError } = await supabase.from('webauthn_credentials').insert({
    user_id: userId,
    credential_id: Buffer.from(
      verification.registrationInfo.credentialID,
    ).toString('base64'),
    public_key: Buffer.from(
      verification.registrationInfo.credentialPublicKey,
    ).toString('base64'),
    counter: verification.registrationInfo.counter,
    created_at: new Date().toISOString(),
  });

  if (credError) {
    throw new Error(`Failed to store credential: ${credError.message}`);
  }

  await supabase
    .from('webauthn_challenges')
    .delete()
    .eq('user_id', userId)
    .eq('type', 'registration');

  return { verified: true };
}

export async function generateAuthentication(userId: string) {
  const { generateAuthenticationOptions } = await import('@simplewebauthn/server');
  const supabase = getServiceSupabase();

  const { data: existingCredentials } = await supabase
    .from('webauthn_credentials')
    .select('credential_id')
    .eq('user_id', userId);

  const allowCredentials =
    existingCredentials?.map((cred: any) => ({
      id: Buffer.from(cred.credential_id, 'base64'),
      type: 'public-key',
    })) || [];

  if (allowCredentials.length === 0) {
    throw new Error('No credentials found for this user');
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials,
    userVerification: 'preferred',
  });

  await supabase.from('webauthn_challenges').upsert({
    user_id: userId,
    challenge: options.challenge,
    expires_at: new Date(Date.now() + 5 * 60 * 1000),
    type: 'authentication',
  });

  return options;
}

export async function verifyAuthentication(
  userId: string,
  credential: AuthenticationCredentialJSON,
) {
  const { verifyAuthenticationResponse } = await import('@simplewebauthn/server');
  const supabase = getServiceSupabase();

  const { data: challengeData, error: challengeError } = await supabase
    .from('webauthn_challenges')
    .select('challenge')
    .eq('user_id', userId)
    .eq('type', 'authentication')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (challengeError || !challengeData) {
    throw new Error('Challenge not found or expired');
  }

  const credentialId = Buffer.from(credential.id, 'base64').toString('base64');
  const { data: credentialData, error: credentialError } = await supabase
    .from('webauthn_credentials')
    .select('credential_id, public_key, counter')
    .eq('credential_id', credentialId)
    .eq('user_id', userId)
    .single();

  if (credentialError || !credentialData) {
    throw new Error('Credential not found');
  }

  const verification = await verifyAuthenticationResponse({
    credential,
    expectedChallenge: challengeData.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    authenticator: {
      credentialID: Buffer.from(credentialData.credential_id, 'base64'),
      credentialPublicKey: Buffer.from(credentialData.public_key, 'base64'),
      counter: credentialData.counter,
    },
  });

  if (!verification.verified) {
    throw new Error('Verification failed');
  }

  await supabase
    .from('webauthn_credentials')
    .update({ counter: verification.authenticationInfo.newCounter })
    .eq('credential_id', credentialId);

  await supabase
    .from('webauthn_challenges')
    .delete()
    .eq('user_id', userId)
    .eq('type', 'authentication');

  return { verified: true };
}
