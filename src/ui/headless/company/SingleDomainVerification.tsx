'use client';

import React, { useState } from 'react';
import { CompanyDomain } from '@/types/company';
import { api } from '@/lib/api/axios';

export interface SingleDomainVerificationProps {
  domain: CompanyDomain;
  onVerificationComplete?: () => void;
  render: (props: {
    status: 'idle' | 'pending' | 'verified' | 'error';
    verificationToken: string | null;
    isLoading: boolean;
    error: string | null;
    success: string | null;
    initiate: () => Promise<void>;
    check: () => Promise<void>;
  }) => React.ReactNode;
}

export function SingleDomainVerification({ domain, onVerificationComplete, render }: SingleDomainVerificationProps): React.ReactElement => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(domain.verification_token || null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'verified' | 'error'>(domain.is_verified ? 'verified' : (domain.verification_token ? 'pending' : 'idle'));

  const initiate = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await api.post(`/api/company/domains/${domain.id}/verify-initiate`);
      setStatus('pending');
      setVerificationToken(response.data.verificationToken);
      setSuccess('Verification initiated');
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
    setSuccess(null);
    try {
      const response = await api.post(`/api/company/domains/${domain.id}/verify-check`);
      if (response.data.verified) {
        setStatus('verified');
        setVerificationToken(null);
        setSuccess('Domain verified');
        onVerificationComplete?.();
      } else {
        setError(response.data.message || 'Verification failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  return <>{render({ status, verificationToken, isLoading, error, success, initiate, check })}</>;
}
