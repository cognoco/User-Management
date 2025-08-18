import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/ui/primitives/card';
import { Button } from '@/ui/primitives/button';
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert';
import { 
  Mail, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  ArrowRight,
  Clock,
  Send,
  Shield,
} from 'lucide-react';
import Link from 'next/link';

interface EmailVerificationProps {
  token?: string;
  email?: string;
  onVerify?: (token: string) => Promise<void>;
  onResendVerification?: (email: string) => Promise<void>;
  onSuccess?: () => void;
  dashboardUrl?: string;
  loginUrl?: string;
  autoVerify?: boolean;
  resendCooldown?: number;
}

export function EmailVerification({
  token,
  email,
  onVerify,
  onResendVerification,
  onSuccess,
  dashboardUrl = '/dashboard',
  loginUrl = '/login',
  autoVerify = true,
  resendCooldown = 60,
}: EmailVerificationProps): React.ReactElement {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  useEffect(() => {
    if (token && onVerify && autoVerify && attemptCount === 0) {
      handleVerification();
    }
  }, [token, onVerify, autoVerify, attemptCount]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleVerification = async (): Promise<void> => {
    if (!token || !onVerify) return;
    
    setIsVerifying(true);
    setError(null);
    setAttemptCount((prev) => prev + 1);
    
    try {
      await onVerify(token);
      setIsVerified(true);
      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (err) {
      setError('Verification failed. The link may be invalid or expired. Please request a new verification email.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendVerification = async (): Promise<void> => {
    if (!email || !onResendVerification) return;
    
    setIsResending(true);
    setError(null);
    setResendSuccess(false);
    
    try {
      await onResendVerification(email);
      setResendSuccess(true);
      setResendTimer(resendCooldown);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err) {
      setError('Failed to resend verification email. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  // Success state
  if (isVerified) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle>Email Verified!</CardTitle>
          <CardDescription>
            Your email has been successfully verified
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Your account is now fully activated. You can access all features.
            </AlertDescription>
          </Alert>

          <Link href={dashboardUrl} className="block">
            <Button className="w-full">
              Continue to Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Verification in progress
  if (isVerifying) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle>Verifying Your Email</CardTitle>
          <CardDescription>
            Please wait while we verify your email address
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            This may take a few seconds...
          </p>
        </CardContent>
      </Card>
    );
  }

  // Verification with token (after error or manual trigger)
  if (token && onVerify) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>
            Click the button below to verify your email address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Verification Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            className="w-full"
            onClick={handleVerification}
            disabled={isVerifying}
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Verify Email
              </>
            )}
          </Button>

          {attemptCount > 0 && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Having trouble? You can request a new verification email below.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Link href="/auth/resend-verification" className="text-sm text-center w-full text-muted-foreground underline">
            Request new verification email
          </Link>
        </CardFooter>
      </Card>
    );
  }

  // Resend verification state (no token provided)
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center">
          <Mail className="h-8 w-8 text-orange-600" />
        </div>
        <CardTitle>Verify Your Email</CardTitle>
        <CardDescription>
          {email ? (
            <>We've sent a verification email to <strong>{email}</strong></>
          ) : (
            'Please check your email for the verification link'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {resendSuccess && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Email Sent!</AlertTitle>
            <AlertDescription>
              We've sent a new verification email. Please check your inbox.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h3 className="font-medium text-sm">Didn't receive the email?</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Check your spam or junk folder</li>
              <li>• Make sure the email address is correct</li>
              <li>• Wait a few minutes and check again</li>
            </ul>
          </div>

          {email && onResendVerification && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResendVerification}
              disabled={isResending || resendTimer > 0}
            >
              {isResending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : resendTimer > 0 ? (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Resend in {resendTimer}s
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Resend Verification Email
                </>
              )}
            </Button>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Link href={loginUrl} className="block">
            <Button variant="ghost" className="w-full">
              Back to Login
            </Button>
          </Link>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-center text-muted-foreground w-full">
          Need help? Contact{' '}
          <a href="mailto:support@example.com" className="underline">
            support@example.com
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}