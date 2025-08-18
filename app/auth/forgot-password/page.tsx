'use client';

import React from 'react';
import { PasswordResetRequest } from '@/components/auth/PasswordResetRequest';
import { api } from '@/lib/api/axios';

export default function ForgotPasswordPage(): React.ReactElement {
  const handleSubmit = async (email: string): Promise<void> => {
    try {
      await api.post('/api/auth/reset-password', { email });
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <PasswordResetRequest
        onSubmit={handleSubmit}
        loginUrl="/auth/login"
        supportEmail="support@example.com"
      />
    </div>
  );
}