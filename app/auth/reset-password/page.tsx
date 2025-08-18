'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PasswordResetForm } from '@/components/auth/PasswordResetForm';
import { PasswordResetRequest } from '@/components/auth/PasswordResetRequest';
import { api } from '@/lib/api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/ui/primitives/card';
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert';
import { Button } from '@/ui/primitives/button';
import { Lock, AlertCircle, Loader2 } from 'lucide-react';

export default function ResetPasswordPage(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      // No token provided, show the request form
      setIsTokenValid(null);
    }
  }, [token]);

  const validateToken = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await api.post('/api/auth/verify-reset-token', { token });
      setIsTokenValid(true);
    } catch (err) {
      setError('Invalid or expired reset token');
      setIsTokenValid(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitRequest = async (email: string): Promise<void> => {
    try {
      await api.post('/api/auth/reset-password', { email });
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  };

  const handleSubmitReset = async (password: string, resetToken: string): Promise<void> => {
    try {
      await api.post('/api/auth/reset-password/confirm', {
        token: resetToken,
        password
      });
    } catch (error) {
      console.error('Failed to reset password:', error);
      throw new Error('Failed to reset password. The link may have expired.');
    }
  };

  const handleSuccess = (): void => {
    router.push('/auth/login?message=Password reset successfully');
  };

  // Show loading while validating token
  if (token && isLoading && isTokenValid === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Validating reset token...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error if token is invalid
  if (token && isTokenValid === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Invalid Reset Link
            </CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2">
              <Button 
                variant="outline"
                className="flex-1" 
                onClick={() => router.push('/auth/reset-password')}
              >
                Request New Link
              </Button>
              <Button 
                className="flex-1" 
                onClick={() => router.push('/auth/login')}
              >
                Return to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show password reset form if token is valid
  if (token && isTokenValid === true) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <PasswordResetForm
          token={token}
          onSubmit={handleSubmitReset}
          onSuccess={handleSuccess}
          loginUrl="/auth/login"
        />
      </div>
    );
  }

  // Show password reset request form (no token)
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <PasswordResetRequest
        onSubmit={handleSubmitRequest}
        loginUrl="/auth/login"
        supportEmail="support@example.com"
      />
    </div>
  );
}