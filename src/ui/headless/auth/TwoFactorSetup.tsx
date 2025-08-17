/**
 * Headless Two Factor Setup Component
 * 
 * This component handles the behavior of two-factor authentication setup without any UI rendering.
 * It follows the headless UI pattern using render props to allow complete UI customization.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';

export type TwoFactorMethod = 'app' | 'sms' | 'email' | 'backup';

export interface TwoFactorSetupProps {
  /**
   * Initial setup method
   */
  initialMethod?: TwoFactorMethod;
  
  /**
   * Available methods for setup
   */
  availableMethods?: TwoFactorMethod[];
  
  /**
   * Called when setup is complete
   */
  onSetupComplete?: (method: TwoFactorMethod) => void;
  
  /**
   * Called when setup is canceled
   */
  onCancel?: () => void;
  
  /**
   * Custom loading state (if not provided, internal state is used)
   */
  isLoading?: boolean;
  
  /**
   * Custom error message (if not provided, internal state is used)
   */
  error?: string;
  
  /**
   * Render prop function that receives two-factor setup state and handlers
   */
  render: (props: {
    currentMethod: TwoFactorMethod;
    availableMethods: TwoFactorMethod[];
    setupStage: 'method-selection' | 'setup' | 'verification' | 'complete';
    handleMethodChange: (method: TwoFactorMethod) => void;
    handleStartSetup: () => void;
    handleVerify: (code: string) => Promise<boolean>;
    handleCancel: () => void;
    isLoading: boolean;
    error?: string;
    qrCode?: string;
    secret?: string;
    backupCodes?: string[];
    phoneNumber?: string;
    email?: string;
  }) => React.ReactNode;
}

export function TwoFactorSetup({
  initialMethod = 'app',
  availableMethods = ['app', 'sms', 'email', 'backup'],
  onSetupComplete,
  onCancel,
  isLoading: externalIsLoading,
  error: externalError,
  render
}: TwoFactorSetupProps) {
  // Get authentication hook
  const { 
    setupTwoFactor, 
    verifyTwoFactor, 
    user,
    getCurrentUser,
    isLoading: authIsLoading, 
    error: authError 
  } = useAuth();
  
  // State
  const [currentMethod, setCurrentMethod] = useState<TwoFactorMethod>(initialMethod);
  const [setupStage, setSetupStage] = useState<'method-selection' | 'setup' | 'verification' | 'complete'>('method-selection');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [setupData, setSetupData] = useState<{
    qrCode?: string;
    secret?: string;
    backupCodes?: string[];
    phoneNumber?: string;
    email?: string;
  }>({});
  
  // Use external state if provided, otherwise use internal state
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : authIsLoading || isSubmitting;
  const formError = externalError !== undefined ? externalError : authError || error;
  
  // Load user profile on mount
  useEffect(() => {
    const loadUserProfile = async () => {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setSetupData({
          ...setupData,
          phoneNumber: (currentUser as any).phoneNumber,
          email: currentUser.email
        });
      }
    };
    
    loadUserProfile();
  }, [getCurrentUser]);
  
  // Handle method change
  const handleMethodChange = (method: TwoFactorMethod) => {
    setCurrentMethod(method);
  };
  
  // Handle start setup
  const handleStartSetup = async () => {
    setError(undefined);
    setIsSubmitting(true);
    
    try {
      const result = await setupTwoFactor();
      
      if (result.success) {
        setSetupData({
          ...setupData,
          qrCode: result.qrCode,
          secret: result.secret,
          backupCodes: result.backupCodes
        });
        setSetupStage('setup');
      } else if (result.error) {
        setError(result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start two-factor setup';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle verify
  const handleVerify = async (code: string) => {
    setError(undefined);
    setIsSubmitting(true);
    
    try {
      const result = await verifyTwoFactor(currentMethod, code);
      
      if (result.success) {
        setSetupStage('complete');
        onSetupComplete?.(currentMethod);
        return true;
      } else if (result.error) {
        setError(result.error);
      }
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify two-factor code';
      setError(errorMessage);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle cancel
  const handleCancel = () => {
    setSetupStage('method-selection');
    setSetupData({});
    onCancel?.();
  };
  
  // Render the component using the render prop
  return render({
    currentMethod,
    availableMethods: availableMethods.filter(method => method === currentMethod || !setupData[method]),
    setupStage,
    handleMethodChange,
    handleStartSetup,
    handleVerify,
    handleCancel,
    isLoading,
    error: formError,
    ...setupData
  });
}

export default TwoFactorSetup;
