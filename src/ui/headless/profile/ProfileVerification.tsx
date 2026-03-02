/**
 * Headless ProfileVerification Component
 *
 * Supports verifying email addresses or company domains
 * through render props.
 */

import { useState } from 'react';
import { useRegistration } from '@/hooks/auth/useRegistration';
import { api } from '@/lib/api/axios';

export type VerificationType = 'email' | 'domain';

export interface ProfileVerificationProps {
  type: VerificationType;
  /** Email address to verify (required when type is 'email') */
  email?: string;
  /** Optional domain id for domain verification */
  domainId?: string;
  /** Called when verification succeeds */
  onVerified?: () => void;
  /** Render prop for UI */
  render: (props: ProfileVerificationRenderProps) => React.ReactNode;
}

export interface ProfileVerificationRenderProps {
  status: 'unverified' | 'pending' | 'verified';
  isLoading: boolean;
  error?: string;
  initiate: () => Promise<void>;
  verify: (token: string) => Promise<void>;
}

export function ProfileVerification({ type, email, domainId, onVerified, render }: ProfileVerificationProps) {
  const { sendVerificationEmail, verifyEmail, isLoading, error } = useRegistration();
  const [status, setStatus] = useState<'unverified' | 'pending' | 'verified'>('unverified');
  const [localError, setLocalError] = useState<string | undefined>();

  const initiate = async () => {
    setLocalError(undefined);
    try {
      if (type === 'email') {
        if (!email) {
          setLocalError('Email address is required for email verification');
          return;
        }
        const token = await sendVerificationEmail(email);
        if (token.success) setStatus('pending');
        else setLocalError(token.error);
      } else if (type === 'domain' && domainId) {
        await api.post(`/api/company/domains/${domainId}/verify`);
        setStatus('pending');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      setLocalError(msg);
    }
  };

  const verify = async (token: string) => {
    try {
      const res = await verifyEmail(token);
      if (res.success) {
        setStatus('verified');
        onVerified?.();
      } else {
        setLocalError(res.error);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      setLocalError(msg);
    }
  };

  return (
    <>{render({
      status,
      isLoading,
      error: localError || error || undefined,
      initiate: type === 'email' ? () => initiate() : initiate,
      verify,
    })}</>
  );
}
