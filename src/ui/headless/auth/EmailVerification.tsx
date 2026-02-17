'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';

export interface EmailVerificationProps {
  render: (props: {
    token: string;
    setToken: (value: string) => void;
    email: string;
    setEmail: (value: string) => void;
    isLoading: boolean;
    error: string | null;
    successMessage: string | null;
    handleVerify: (e: React.FormEvent) => void;
    handleResend: (e: React.FormEvent) => void;
  }) => React.ReactNode;
}

export function EmailVerification({ render }: EmailVerificationProps) {
  const verifyEmail = useAuth().verifyEmail;
  const sendVerificationEmail = useAuth().sendVerificationEmail;
  const isLoading = useAuth().isLoading;
  const error = useAuth().error;
  const successMessage = useAuth().successMessage;
  const clearError = useAuth().clearError;
  const clearSuccess = useAuth().clearSuccess;

  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    clearSuccess();
    setSubmitted(false);
    try {
      await verifyEmail(token);
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    clearSuccess();
    setSubmitted(false);
    try {
      await sendVerificationEmail(email);
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    }
  };

  return (
    <>{render({ token, setToken, email, setEmail, isLoading: isLoading || false, error: submitted ? error : null, successMessage: submitted ? successMessage : null, handleVerify, handleResend })}</>
  );
}
