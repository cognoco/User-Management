'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EmailVerification } from '@/components/auth/EmailVerification';
import { api } from '@/lib/api/axios';

export default function VerifyEmailPage(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const handleVerify = async (token: string): Promise<void> => {
    try {
      await api.post('/api/auth/verify-email', { token });
    } catch (error) {
      console.error('Email verification failed:', error);
      throw new Error('Email verification failed');
    }
  };

  const handleResendEmail = async (email: string): Promise<void> => {
    try {
      await api.post('/api/auth/send-verification', { email });
    } catch (error) {
      console.error('Failed to resend verification email:', error);
      throw new Error('Failed to send verification email');
    }
  };

  const handleSuccess = (): void => {
    router.push('/dashboard?verified=true');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <EmailVerification
        token={searchParams.get('token')}
        email={searchParams.get('email')}
        onVerify={handleVerify}
        onResendEmail={handleResendEmail}
        onSuccess={handleSuccess}
        loginUrl="/auth/login"
      />
    </div>
  );
}