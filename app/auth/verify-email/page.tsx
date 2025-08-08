'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation'; // Import useSearchParams
import { useAuth } from '@/hooks/auth/useAuth'; // Adjust path if needed
// IMPORTANT: Use supabase-js browser client directly to avoid pulling node-fetch into client bundle
// Replace direct Supabase usage with API calls to avoid bundling node-fetch in client
async function apiGetSession() {
  const res = await fetch('/api/auth/session', { credentials: 'include' });
  if (!res.ok) return null;
  return res.json();
}
async function apiGetUser() {
  const res = await fetch('/api/auth/account', { credentials: 'include' });
  if (!res.ok) return null;
  return res.json();
}
import { Button } from '@/ui/primitives/button';
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert';
import { Loader2, AlertCircle, MailWarning, CheckCircle } from 'lucide-react'; // Added icons

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams(); // Get search params
  const { 
      sendVerificationEmail, 
      isLoading: storeLoading,
      error: storeError, 
      clearError, 
      clearSuccessMessage 
  } = useAuth();
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'idle'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [email, setEmail] = useState<string | null>(null); // Add state for email

  // Use refs for timeout IDs
  const sessionCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const verificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasProcessedFragment = useRef(false); // Prevent double processing

  useEffect(() => {
    // --- URL Fragment Parsing ---
    if (typeof window !== 'undefined' && !hasProcessedFragment.current) {
      const hash = window.location.hash;
      if (hash) {
        hasProcessedFragment.current = true; // Mark as processed
        console.log("Processing URL fragment:", hash);
        const params = new URLSearchParams(hash.substring(1));
        const errorDescription = params.get('error_description');
        const errorCode = params.get('error_code'); // e.g., 401
        const errorType = params.get('error'); // e.g., 'server_error', 'invalid_request', 'access_denied', potentially 'otp_expired' or similar depending on Supabase version/flow

        if (errorDescription) {
          console.error(`Verification Error from URL: ${errorDescription} (Code: ${errorCode}, Type: ${errorType})`);
          setStatus('error');
          if (errorDescription.toLowerCase().includes('link is invalid or has expired') || errorDescription.toLowerCase().includes('otp has expired')) {
            setErrorMessage('Verification link expired or is invalid. Please request a new one.');
          } else {
            setErrorMessage(errorDescription);
          }
          // Clear timeouts if error found in fragment
          if (sessionCheckTimeoutRef.current) clearTimeout(sessionCheckTimeoutRef.current);
          if (verificationTimeoutRef.current) clearTimeout(verificationTimeoutRef.current);
          // Attempt to get email from state for resend button if needed (useful if query param wasn't passed)
          if (!email) {
             apiGetUser().then((user) => {
                if (user?.email) {
                   setEmail((user.email as string | null) || null);
                }
             });
          }
          return; // Stop further processing in this effect if error handled
        }
      }
    }
    // --- End URL Fragment Parsing ---

    // --- Initial Setup & State Reset ---
    const emailFromQuery = searchParams.get('email');
    if (emailFromQuery && !email) { // Set email only if not already set
        setEmail(decodeURIComponent(emailFromQuery));
    }
    clearError();
    clearSuccessMessage();
    // Don't reset status/error if already set by fragment processing
    if (status !== 'error') {
        setErrorMessage(null);
        setStatus('verifying');
    }
    setResendStatus(null);
    // --- End Initial Setup ---


    // --- Auth State Listener ---
    // Poll for session change as a lightweight client fallback
    const poll = async () => {
      const session = await apiGetSession();
      if (session?.user?.email_confirmed_at) {
        setStatus('success');
        setErrorMessage(null);
        return true;
      }
      return false;
    };
    const interval = setInterval(async () => {
      const done = await poll();
      if (done) clearInterval(interval);
    }, 1500);
    // --- End Auth State Listener ---

    // --- Fallback Timers (Only if no error in fragment) ---
    if (status !== 'error') {
        // Initial check if already verified
        sessionCheckTimeoutRef.current = setTimeout(async () => {
            try {
                const session = await apiGetSession();
                if (session && session.user?.email_confirmed_at) {
                    console.log("Already verified via session check.");
                    setStatus('success');
                    setErrorMessage(null);
                    if (verificationTimeoutRef.current) clearTimeout(verificationTimeoutRef.current);
                } else if (session && session.user && !email) {
                    // If we have an unverified session user, grab their email for potential resend
                    setEmail((session.user.email as string | null) || null);
                } else {
                    console.log('Initial session check: Email not confirmed yet.');
                }
            } catch (err) {
                console.error("Session check error:", err);
            }
        }, 1000);

        // Verification timeout
        verificationTimeoutRef.current = setTimeout(() => {
            if (status === 'verifying') {
                 console.log('Verification timed out without success or fragment error.');
                 setStatus('idle'); // Change to 'idle' for a more specific message
                 setErrorMessage(null); // Clear generic timeout error
                 // Try to get email if still missing
                 if (!email) {
                      apiGetUser().then((user) => {
                        if (user?.email) setEmail(user.email as string);
                      });
                 }
            }
        }, 8000); 
    }
    // --- End Fallback Timers ---

    return () => {
      try { clearInterval(interval); } catch {}
      // Clear timeouts using refs on cleanup
      if (sessionCheckTimeoutRef.current) clearTimeout(sessionCheckTimeoutRef.current);
      if (verificationTimeoutRef.current) clearTimeout(verificationTimeoutRef.current);
    };
  // Only run on mount essentially, plus when searchParams might change if email needs update
  }, [searchParams]); // Removed store dependencies as they are actions/state used elsewhere


  // Redirect on Success
  useEffect(() => {
    if (status === 'success') {
      console.log('Email verified successfully. Redirecting...');
      const redirectTimeout = setTimeout(() => {
        router.push('/'); // Redirect to dashboard or desired page
      }, 2000); 

      return () => clearTimeout(redirectTimeout);
    }
  }, [status, router]);

  const handleResendVerification = async () => {
    if (!email) {
        // Attempt one last time to get email from current user if available
        const { data: { user } } = await supabase.auth.getUser();
        const currentEmail = user?.email;
        
        if (!currentEmail) {
             setResendStatus({ message: 'Could not determine email address. Please return to login and try again.', type: 'error' });
             console.error('Email not available for resend and could not be fetched.');
             return;
        }
        setEmail(currentEmail); // Set email for future attempts if needed
    }
    
    const targetEmail = email || (await supabase.auth.getUser()).data.user?.email; // Ensure we use the latest found email
    
    if (!targetEmail) {
         setResendStatus({ message: 'Could not determine email address. Please return to login and try again.', type: 'error' });
         console.error('Email still not available for resend.');
         return;
    }

    setResendStatus(null);
    clearError(); // Clear store errors
    clearSuccessMessage();
    console.log(`Attempting to resend verification email to: ${targetEmail}`);
    const result = await sendVerificationEmail(targetEmail); // Use the determined email
    if (result.success) {
        setResendStatus({ message: 'Verification email sent successfully. Please check your inbox (and spam folder).', type: 'success' });
    } else {
        setResendStatus({ message: result.error || 'Failed to send verification email. Please try again later.', type: 'error' });
    }
  };

  const isLoading = status === 'verifying' || storeLoading;

  // --- Render Logic ---
  let title = 'Verifying Email...';
  let icon = <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />;
  let content = <p className="text-center text-muted-foreground">Please wait while we check your verification status.</p>;
  let showResend = false;
  let showLogin = false;

  if (status === 'success') {
    title = 'Email Verified!';
    icon = <CheckCircle className="mx-auto h-12 w-12 text-green-500" />;
    content = (
        <Alert variant="default" className="bg-green-100 border-green-300 text-green-800">
            <AlertTitle>Success!</AlertTitle>
            <AlertDescription>
                Your email address has been successfully verified. You will be redirected shortly.
            </AlertDescription>
        </Alert>
    );
    showLogin = true;
  } else if (status === 'error') {
    title = 'Verification Failed';
    icon = <AlertCircle className="mx-auto h-12 w-12 text-destructive" />;
    content = (
        <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage || storeError || 'An unknown error occurred during verification.'}</AlertDescription>
        </Alert>
    );
    showResend = true;
    showLogin = true;
  } else if (status === 'idle') {
      title = 'Verification Status Unknown';
      icon = <MailWarning className="mx-auto h-12 w-12 text-yellow-500" />;
      content = (
          <Alert variant="default" className="bg-yellow-50 border-yellow-300 text-yellow-800">
              <AlertTitle>Waiting for Verification</AlertTitle>
              <AlertDescription>
                  We could not automatically detect your verification status. If you just clicked the link in your email, please wait a moment. If you haven&apos;t received an email or the link has expired, you can request a new one.
              </AlertDescription>
          </Alert>
      );
      showResend = true;
      showLogin = true;
  }

  return (
    <div className="container max-w-md mx-auto py-12"> {/* Use container */} 
      <div className="bg-card rounded-lg shadow p-8 space-y-6"> {/* Use card styling */} 
        <div className="text-center">
            {icon}
            <h1 className="text-2xl font-bold tracking-tight mt-4">{title}</h1>
        </div>
        
        {content}

        {resendStatus && (
            <Alert variant={resendStatus.type === 'success' ? 'default' : 'destructive'} className={`mt-4 ${resendStatus.type === 'success' ? 'bg-green-100 border-green-300 text-green-800' : ''}`}>
                <AlertTitle>{resendStatus.type === 'success' ? 'Email Sent' : 'Error'}</AlertTitle>
                <AlertDescription>{resendStatus.message}</AlertDescription>
            </Alert>
        )}

        <div className="mt-6 space-y-4">
            {showResend && (
                <Button
                    onClick={handleResendVerification}
                    disabled={isLoading || !email} // Disable if email is unknown
                    className="w-full"
                    variant="secondary"
                >
                    {isLoading ? 'Sending...' : 'Resend Verification Email'}
                    {!email && <span className="text-xs ml-2">(Requires Email)</span>}
                </Button>
            )}

            {showLogin && (
                <Button
                    onClick={() => router.push('/auth/login')}
                    variant="outline"
                    className="w-full"
                >
                    Return to Login
                </Button>
            )}
        </div>
      </div>
    </div>
  );
} 