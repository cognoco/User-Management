'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api/axios';

export interface PasswordlessLoginProps {
  render: (props: {
    email: string;
    setEmail: (value: string) => void;
    status: 'idle' | 'success' | 'error';
    error: string | null;
    isLoading: boolean;
    handleSendLink: (e: React.FormEvent) => void;
  }) => React.ReactNode;
}

export function PasswordlessLogin({ render }: PasswordlessLoginProps): React.ReactElement => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendLink = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setStatus('idle');
    try {
      await api.post('/api/auth/passwordless', { email });
      setStatus('success');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send magic link');
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>{render({ email, setEmail, status, error, isLoading, handleSendLink })}</>
  );
}
