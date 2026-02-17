import { useState, useCallback } from 'react';
import { AuthService } from '@/core/auth/interfaces';
import { LoginPayload, AuthResult } from '@/core/auth/models';
import { UserManagementConfiguration } from '@/core/config';

export interface UseLogin {
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
  mfaRequired: boolean;
  tempAccessToken: string | null;
  login: (credentials: LoginPayload) => Promise<AuthResult>;
  resendVerificationEmail: (email: string) => Promise<AuthResult>;
  clearState: () => void;
}

export function useLogin(): UseLogin {
  const authService =
    UserManagementConfiguration.getServiceProvider<AuthService>('authService');
  if (!authService) {
    throw new Error('AuthService is not registered in the service provider registry');
  }

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [tempAccessToken, setTempAccessToken] = useState<string | null>(null);

  const login = useCallback(
    async (credentials: LoginPayload): Promise<AuthResult> => {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);
      try {
        const result = await authService.login(credentials);
        setIsLoading(false);
        if (result.success) {
          if (result.requiresMfa) {
            setMfaRequired(true);
            setTempAccessToken(result.token ?? null);
          } else {
            setSuccessMessage('Login successful');
          }
        } else {
          setError(result.error ?? 'Login failed');
        }
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed';
        setIsLoading(false);
        setError(message);
        return { success: false, error: message };
      }
    },
    [authService]
  );

  const resendVerificationEmail = useCallback(
    async (email: string): Promise<AuthResult> => {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);
      try {
        const result = await authService.sendVerificationEmail(email);
        setIsLoading(false);
        if (result.success) {
          setSuccessMessage((result as any).message ?? 'Verification email sent successfully.');
        } else {
          setError(result.error ?? 'Failed to send verification email.');
        }
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to send verification email.';
        setIsLoading(false);
        setError(message);
        return { success: false, error: message };
      }
    },
    [authService]
  );

  const clearState = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
    setMfaRequired(false);
    setTempAccessToken(null);
  }, []);

  return {
    isLoading,
    error,
    successMessage,
    mfaRequired,
    tempAccessToken,
    login,
    resendVerificationEmail,
    clearState,
  };
}

export default useLogin;
