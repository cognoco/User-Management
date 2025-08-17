'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { Button } from '@/ui/primitives/button';
import { Input } from '@/ui/primitives/input';
import { Checkbox } from '@/ui/primitives/checkbox';
import { Label } from '@/ui/primitives/label';
import { Alert, AlertTitle, AlertDescription } from '@/ui/primitives/alert';
import { OAuthButtons } from './OAuthButtons';
import { ErrorBoundary, DefaultErrorFallback } from '@/ui/styled/common/ErrorBoundary';
import Link from 'next/link';
import { Spinner } from '@/ui/primitives/spinner';
import {
  LoginFormReact19 as HeadlessLoginFormReact19,
  type LoginPayload
} from '@/ui/headless/auth/LoginFormReact19';

export function LoginFormReact19(): React.ReactElement {
  const [apiError, setApiError] = useState<string | null>(null);
  const login = useAuth().login;
  const sendVerificationEmail = useAuth().sendVerificationEmail;

  const handleCustomSubmit = async (credentials: LoginPayload) => {
    setApiError(null);
    try {
      const result = await login(
        credentials.email,
        credentials.password,
        credentials.rememberMe
      );
      if (!result.success) {
        if (result.code === 'EMAIL_NOT_VERIFIED') {
          setApiError(
            'Email not verified. Please check your inbox for the verification email.'
          );
        } else {
          setApiError(
            result.error ||
              'Login failed. Please check your credentials and try again.'
          );
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setApiError('An unexpected error occurred. Please try again later.');
    }
  };

  const handleResendVerification = async (email: string) => {
    if (!email) {
      setApiError('Please enter your email address first.');
      return;
    }

    try {
      const result = await sendVerificationEmail(email);
      if (result.success) {
        setApiError('Verification email sent. Please check your inbox.');
      } else {
        setApiError(
          result.error || 'Failed to send verification email. Please try again.'
        );
      }
    } catch (err: any) {
      setApiError(err.message || 'An unexpected error occurred.');
    }
  };

  return (
    <ErrorBoundary fallback={DefaultErrorFallback}>
      <HeadlessLoginFormReact19 onSubmit={handleCustomSubmit}>
        {({
          handleSubmit,
          emailValue,
          setEmailValue,
          passwordValue,
          setPasswordValue,
          rememberMeValue,
          setRememberMeValue,
          isSubmitting,
          isPending,
          errors,
          touched,
          handleBlur
        }) => (
          <div className="w-full max-w-md mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Sign in to your account
              </h2>
              <p className="text-muted-foreground mt-2">
                Enter your email below to sign in
              </p>
            </div>

            <OAuthButtons mode="login" />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            {(apiError || errors.form) && (
              <Alert variant="destructive">
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>
                  {apiError || errors.form}
                  {emailValue && apiError?.includes('not verified') && (
                    <button
                      type="button"
                      onClick={() => handleResendVerification(emailValue)}
                      className="text-primary hover:underline ml-2"
                    >
                      Resend verification email
                    </button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    placeholder="email@example.com"
                    value={emailValue}
                    onChange={(e) => setEmailValue(e.target.value)}
                    onBlur={() => handleBlur('email')}
                    autoComplete="email"
                    disabled={isPending}
                    aria-invalid={touched.email && errors.email ? 'true' : 'false'}
                  />
                  {touched.email && errors.email && (
                    <p className="text-destructive text-sm mt-1">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="********"
                    value={passwordValue}
                    onChange={(e) => setPasswordValue(e.target.value)}
                    onBlur={() => handleBlur('password')}
                    autoComplete="current-password"
                    disabled={isPending}
                    aria-invalid={
                      touched.password && errors.password ? 'true' : 'false'
                    }
                  />
                  {touched.password && errors.password && (
                    <p className="text-destructive text-sm mt-1">
                      {errors.password}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMeValue}
                  onCheckedChange={(checked) => setRememberMeValue(!!checked)}
                />
                <Label htmlFor="rememberMe" className="text-sm font-normal">
                  Remember me for 30 days
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full mt-6"
                disabled={isPending || isSubmitting}
              >
                {isPending ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="text-center text-sm">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="text-primary hover:underline">
                Sign up
              </Link>
            </div>
          </div>
        )}
      </HeadlessLoginFormReact19>
    </ErrorBoundary>
  );
}
