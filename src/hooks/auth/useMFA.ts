/**
 * Multi-Factor Authentication Hook
 * 
 * This hook provides MFA functionality.
 * It follows the architecture principles by connecting the UI layer to the service layer.
 */

import { useState, useCallback } from 'react';
import { AuthService } from '@/core/auth/interfaces';
import { AuthResult } from '@/core/common/user-types';
import { UserManagementConfiguration } from '@/core/config';

/**
 * Hook for multi-factor authentication functionality
 * 
 * @returns MFA state and methods
 */
export function useMFA() {
  // Get the auth service from the service provider registry
  const authService = UserManagementConfiguration.getServiceProvider<AuthService>('authService');
  
  if (!authService) {
    throw new Error('AuthService is not registered in the service provider registry');
  }
  
  // Local state for MFA
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [setupData, setSetupData] = useState<MFASetupResponse | null>(null);
  
  // Set up MFA
  const setupMFA = useCallback(async (): Promise<MFASetupResponse> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await authService.setupMFA();
      
      setIsLoading(false);
      setSetupData(response);
      setSuccessMessage('MFA setup initialized');
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'MFA setup failed';
      
      setIsLoading(false);
      setError(errorMessage);
      
      throw error;
    }
  }, [authService]);
  
  // Verify MFA code
  const verifyMFA = useCallback(async (code: string): Promise<MFAVerifyResponse> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await authService.verifyMFA(code);
      
      setIsLoading(false);
      
      if (response.success) {
        setSuccessMessage('MFA verification successful');
      } else if (response.error) {
        setError(response.error);
      }
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'MFA verification failed';
      
      setIsLoading(false);
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [authService]);
  
  // Disable MFA
  const disableMFA = useCallback(async (code: string): Promise<AuthResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await authService.disableMFA(code);
      
      setIsLoading(false);
      
      if (result.success) {
        setSuccessMessage('MFA disabled successfully');
      } else if (result.error) {
        setError(result.error);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to disable MFA';
      
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
  
  // Reset setup data
  const resetSetupData = useCallback(() => {
    setSetupData(null);
  }, []);
  
  return {
    // State
    isLoading,
    error,
    successMessage,
    setupData,
    
    // Methods
    setupMFA,
    verifyMFA,
    disableMFA,
    clearMessages,
    resetSetupData
  };
}

export default useMFA;
