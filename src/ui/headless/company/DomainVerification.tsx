'use client';

import React, { useEffect, useState } from 'react';
import { CompanyProfile } from '@/types/company';
import { api } from '@/lib/api/axios';

export interface DomainVerificationProps {
  profile: Pick<CompanyProfile, 'id' | 'domain_name' | 'domain_verified' | 'domain_verification_token' | 'website'> | null;
  onVerificationChange?: () => void;
  render: (props: {
    status: 'idle' | 'pending' | 'verified' | 'error';
    token: string | null;
    domain: string | null;
    isLoading: boolean;
    error: string | null;
    initiate: () => Promise<void>;
    check: () => Promise<void>;
  }) => React.ReactNode;
}

export function DomainVerification({ profile, onVerificationChange, render }: DomainVerificationProps): React.ReactElement => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'verified' | 'error'>('idle');
  const [token, setToken] = useState<string | null>(null);
  const [domain, setDomain] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    if (profile?.domain_verified) {
      setStatus('verified');
      setDomain(profile.domain_name ?? null);
      setToken(null);
    } else if (profile?.domain_verification_token) {
      setStatus('pending');
      setDomain(profile.domain_name ?? null);
      setToken(profile.domain_verification_token ?? null);
    } else {
      setStatus('idle');
      try {
        setDomain(profile?.website ? new URL(profile.website).hostname.replace(/^www\./, '') : null);
      } catch { setDomain(null); }
      setToken(null);
    }
  }, [profile]);

  const initiate = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('/api/company/verify-domain/initiate');
      setStatus('pending');
      setDomain(response.data.domainName);
      setToken(response.data.verificationToken);
      onVerificationChange?.();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const check = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('/api/company/verify-domain/check');
      if (response.data.verified) {
        setStatus('verified');
        setToken(null);
        onVerificationChange?.();
      } else {
        setError(response.data.message || 'Verification failed');
        setStatus('pending');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  return <>{render({ status, token, domain, isLoading, error, initiate, check })}</>;
}
