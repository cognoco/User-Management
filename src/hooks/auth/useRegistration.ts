/**
 * Registration Hook
 * 
 * This hook provides registration-specific functionality.
 * It follows the architecture principles by connecting the UI layer to the service layer.
 */

import { useState, useCallback } from 'react';
import { AuthService } from '@/core/auth/interfaces';
import { RegistrationPayload, AuthResult } from '@/core/common/user-types';
import { UserManagementConfiguration } from '@/core/config';

/**
 * Hook for user registration functionality
 * 
 * @returns Registration state and methods
 */
export function useRegistration() {
  // Get the auth service from the service provider registry
  const authService = UserManagementConfiguration.getServiceProvider<AuthService>('authService');
  
  if (!authService) {
    throw new Error('AuthService is not registered in the service provider registry');
  }
  
  // Local state for registration
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  
  // Register method
  const register = useCallback(async (userData: RegistrationPayload): Promise<AuthResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await authService.register(userData);
      
      setIsLoading(false);
      
      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        setIsRegistered(true);
        setSuccessMessage('Registration successful');
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      
      setIsLoading(false);
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [authService]);
  
  // Send verification email
  const sendVerificationEmail = useCallback(async (email: string): Promise<AuthResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await authService.sendVerificationEmail(email);
      
      setIsLoading(false);
      
      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        setSuccessMessage('Verification email sent');
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send verification email';
      
      setIsLoading(false);
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [authService]);
  
  // Verify email
  const verifyEmail = useCallback(async (token: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await authService.verifyEmail(token);
      
      setIsLoading(false);
      setSuccessMessage('Email verified successfully');
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Email verification failed';
      
      setIsLoading(false);
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [authService]);
  
  // Clear any error or success messages
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);
  
  return {
    // State
    isLoading,
    error,
    successMessage,
    isRegistered,
    
    // Methods
    register,
    sendVerificationEmail,
    verifyEmail,
    clearMessages
  };
}

export default useRegistration;
