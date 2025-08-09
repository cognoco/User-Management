'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/ui/primitives/button';
import { Input } from '@/ui/primitives/input';
import { Label } from '@/ui/primitives/label';
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert';
import { Checkbox } from '@/ui/primitives/checkbox';
import useLoginFormLogic from '@/hooks/auth/useLoginFormLogic';
import { ErrorBoundary, DefaultErrorFallback } from '@/ui/styled/common/ErrorBoundary';
import { RateLimitFeedback } from '@/ui/styled/common/RateLimitFeedback';
import { OAuthButtons } from './OAuthButtons';
import { MFAVerificationForm } from './MFAVerificationForm';
import { WebAuthnLogin } from '@/ui/styled/auth/WebAuthnLogin';
import { LoginForm as HeadlessLoginForm } from '@/ui/headless/auth/LoginForm';
import Link from 'next/link';
import type { LoginPayload } from '@/core/auth/models';

interface LoginFormProps {
  onSubmit?: (credentials: LoginPayload) => Promise<void>;
}

/**
 * Styled Login Form Component
 * 
 * This is a fully styled, production-ready login form that uses the headless
 * LoginForm component for behavior and the useLoginFormLogic hook for business logic.
 * 
 * ARCHITECTURE: This component is purely presentational and delegates all
 * business logic to the hook and headless component. It should not contain
 * any authentication calls or business logic.
 */
const LoginForm: React.FC<LoginFormProps> = ({ onSubmit: customOnSubmit }) => {
  const [showPassword, setShowPassword] = useState(false);

  // Get all business logic from the hook
  const {
    onSubmit: businessLogicOnSubmit,
    handleResendVerification,
    handleMfaSuccess,
    handleLoginSuccess,
    handleMfaCancel,
    handleRateLimitComplete,
    // Removed error-store derived states for public login page
    rateLimitInfo,
    mfaRequired,
    tempAccessToken,
    authError,
    success,
    isLoading,
  } = useLoginFormLogic();

  // Use custom onSubmit if provided, otherwise use business logic
  const onSubmit = customOnSubmit || businessLogicOnSubmit;

  // If MFA is required, show MFA forms instead of login form
  if (mfaRequired && tempAccessToken) {
    return (
      <>
        {/** WebAuthn option if available */}
        <WebAuthnLogin userId={''} onSuccess={() => handleLoginSuccess({})} />
        <MFAVerificationForm
          accessToken={tempAccessToken}
          onSuccess={(user: any, token: string) => handleMfaSuccess(user, token)}
          onCancel={handleMfaCancel}
        />
      </>
    );
  }

  return (
    <ErrorBoundary fallback={DefaultErrorFallback}>
      <HeadlessLoginForm
        onSubmit={onSubmit}
        error={authError || undefined}
        isLoading={isLoading}
        render={({
          handleSubmit: formSubmit,
          emailValue,
          setEmailValue,
          passwordValue,
          setPasswordValue,
          rememberMeValue,
          setRememberMeValue,
          isSubmitting,
          isValid,
          errors,
          touched,
          handleBlur,
        }) => (
          <div className="w-full max-w-md mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Sign in to your account</h2>
              <p className="text-muted-foreground mt-2">
                Enter your email below to sign in to your account
              </p>
            </div>

            <OAuthButtons />

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

            {rateLimitInfo && (
              <RateLimitFeedback
                windowMs={15 * 60 * 1000}
                retryAfter={rateLimitInfo.retryAfter}
                remainingAttempts={rateLimitInfo.remainingAttempts}
                maxAttempts={100}
                onCountdownComplete={handleRateLimitComplete}
              />
            )}

            {(errors.form || authError) && (
              <Alert variant="destructive">
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>
                  {errors.form || authError}
                </AlertDescription>
              </Alert>
            )}
            {success && (
                <Alert>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
            )}

            <form onSubmit={formSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={emailValue}
                  onChange={(e) => setEmailValue(e.target.value)}
                  onBlur={() => handleBlur('email')}
                  aria-invalid={errors.email ? 'true' : 'false'}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
                {touched.email && errors.email && (
                  <p id="email-error" className="text-destructive text-sm mt-1">
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordValue}
                    onChange={(e) => setPasswordValue(e.target.value)}
                    onBlur={() => handleBlur('password')}
                    aria-invalid={errors.password ? 'true' : 'false'}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-7 w-7"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {touched.password && errors.password && (
                  <p id="password-error" className="text-destructive text-sm mt-1">
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMeValue}
                  onCheckedChange={(checked) => setRememberMeValue(checked === true)}
                  aria-label="Remember me"
                />
                <Label htmlFor="rememberMe" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Remember me
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                aria-describedby={errors.form ? 'form-error' : undefined}
              >
                {isSubmitting ? 'Signing in...' : 'Login'}
              </Button>

              <div className="text-center text-sm">
                <Link 
                  href="/auth/reset-password" 
                  className="text-primary hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>

              <div className="text-center text-sm">
                Don't have an account?{' '}
                <Link 
                  href="/auth/register" 
                  className="text-primary hover:underline"
                >
                  Sign up
                </Link>
              </div>
            </form>
          </div>
        )}
      />
    </ErrorBoundary>
  );
};

export default LoginForm;
