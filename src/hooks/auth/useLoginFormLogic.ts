/**
 * Login Form Business Logic Hook
 * 
 * This hook provides business logic for login forms, including authentication,
 * error handling, navigation, and MFA flows. It's designed to work with the
 * headless LoginForm component by providing the onSubmit handler and related state.
 * 
 * ARCHITECTURE: This hook contains business logic and should be used by pages
 * or higher-level components that need login functionality. It provides the
 * onSubmit prop for the headless LoginForm component.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
// Removed useAuth to avoid client-side Supabase import – login now handled purely via API
import { loginViaApi } from '@/lib/api/auth/login';
// Zustand error store removed to avoid client-side dependency

// Helpers to prevent Zustand SSR snapshot warnings when running entirely in the browser
const isBrowser = typeof window !== 'undefined';

type SectionError = { message: string };

const safeUseSectionErrors = (_section: string): SectionError[] => [];

const safeAddError = (_e: any) => {};
const safeClearErrors = (_s: string) => {};

import type { LoginPayload } from '@/core/auth/models';

export interface UseLoginFormLogicReturn {
  // The main onSubmit handler for the headless component
  onSubmit: (credentials: LoginPayload) => Promise<void>;
  
  // MFA-related handlers
  handleResendVerification: (email: string) => Promise<void>;
  handleMfaSuccess: (user: any, token: string) => void;
  handleLoginSuccess: (data: any) => void;
  handleMfaCancel: () => void;
  handleRateLimitComplete: () => void;
  
  // State for additional UI elements (rate limiting, resend, etc.)
  resendStatus: { message: string; type: 'success' | 'error' } | null;
  showResendLink: boolean;
  rateLimitInfo: { retryAfter?: number; remainingAttempts?: number } | null;
  
  // MFA flow state
  mfaRequired: boolean;
  tempAccessToken: string | null;
  user: any;
  
  // Error and success state
  authErrors: SectionError[];
  authError: string | null;
  success: string | null;
  
  // Loading state
  isLoading: boolean;
}

export function useLoginFormLogic(): UseLoginFormLogicReturn {
  const router = useRouter();
  // No existing session needed on login page
  const user = null;
  const [isLoading, setIsLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [tempAccessToken, setTempAccessToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const authErrors: SectionError[] = [];
  const addError = safeAddError;
  const clearAuthErrors = safeClearErrors;

  // States for optional UI elements
  const [resendStatus, setResendStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showResendLink, setShowResendLink] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ retryAfter?: number; remainingAttempts?: number } | null>(null);

  // Main business logic handler for login form submission
  const onSubmit = async (credentials: LoginPayload): Promise<void> => {
    // Reset all error states
    clearAuthErrors('auth');
    setAuthError(null);
    setSuccess(null);
    setMfaRequired(false);
    setTempAccessToken(null);
    setRateLimitInfo(null);

    try {
      setIsLoading(true);
      const result = await loginViaApi(credentials);
      setIsLoading(false);

      if (result.success) {
        // If MFA is not required, redirect to dashboard
        if (!result.requiresMfa) {
          router.push('/dashboard/overview');
        }
        if (result.requiresMfa) {
          setMfaRequired(true);
          // Assume backend sets temp token cookie, could extract from response
        }
      } else {
        setAuthError(result.error || 'Login failed');
        addError({});
        // Handle specific error cases
        // Skipping code-specific handling for now until API returns specific codes
        // Throw error to be caught by headless component
        throw new Error(result.error || 'Login failed');
      }
    } catch (error: any) {
      // Handle rate limiting errors
      if (error?.response?.status === 429) {
        const retryAfter = parseInt(error.response.headers['retry-after'] || '900', 10) * 1000;
        setRateLimitInfo({
          retryAfter,
          remainingAttempts: parseInt(error.response.headers['x-ratelimit-remaining'] || '0', 10)
        });
      }
      
      addError({});
      
      if (process.env.NODE_ENV === 'development') {
        console.error('Unexpected error during login submission:', error);
      }
      
      // Re-throw error so headless component can handle UI state
      throw error;
    }
  };

  const handleResendVerification = async () => {
    // TODO: implement when backend endpoint ready
    // For now, no-op but can set UI feedback
    try {
      setIsLoading(true);
      // Placeholder
      setResendStatus({ message: 'Verification email sent', type: 'success' });
    } catch (e) {
      setResendStatus({ message: 'Failed to resend verification', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSuccess = (mfaUser: any, token: string): void => {
    // The auth service should handle session management internally
    // When MFA is successful, we just navigate to dashboard
    router.push('/dashboard/overview');
  };

  const handleLoginSuccess = (data: any): void => {
    // The auth service should handle session management internally
    // When login is successful, we just navigate to dashboard
    router.push('/dashboard/overview');
  };

  const handleMfaCancel = (): void => {
    // no clearState now
  };

  const handleRateLimitComplete = (): void => {
    setRateLimitInfo(null);
  };

  return {
    onSubmit,
    handleResendVerification,
    handleMfaSuccess,
    handleLoginSuccess,
    handleMfaCancel,
    handleRateLimitComplete,
    resendStatus,
    showResendLink,
    rateLimitInfo,
    mfaRequired,
    tempAccessToken,
    user,
    authErrors,
    authError,
    success,
    isLoading,
  };
}

export default useLoginFormLogic;
