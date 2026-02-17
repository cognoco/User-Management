/**
 * Headless MFA Setup Component
 * 
 * This component handles the behavior of MFA setup without any UI rendering.
 * It follows the headless UI pattern using render props to allow complete UI customization.
 */

import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { MFASetupResponse, MFAVerifyResponse } from '@/core/auth/models';
import { z } from 'zod';

export interface MFASetupProps {
  /**
   * Called when MFA setup is successfully completed
   */
  onSetupComplete?: (response: MFAVerifyResponse) => void;
  
  /**
   * Called when MFA setup is canceled
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
   * Render prop function that receives form state and handlers
   */
  render: (props: {
    setupState: 'initial' | 'qrcode' | 'verification' | 'complete';
    handleStartSetup: () => void;
    handleVerifyCode: (e: FormEvent) => void;
    handleCancel: () => void;
    verificationCode: string;
    setVerificationCode: (value: string) => void;
    isLoading: boolean;
    isValid: boolean;
    qrCode?: string;
    secret?: string;
    backupCodes?: string[];
    errors: {
      verificationCode?: string;
      form?: string;
    };
    touched: {
      verificationCode: boolean;
    };
    handleBlur: () => void;
  }) => React.ReactNode;
}

export function MFASetup({
  onSetupComplete,
  onCancel,
  isLoading: externalIsLoading,
  error: externalError,
  render
}: MFASetupProps) {
  // Get MFA hook
  const { setupMFA, verifyMFA, isLoading: mfaIsLoading, error: mfaError } = useAuth();
  
  // Setup state
  const [setupState, setSetupState] = useState<'initial' | 'qrcode' | 'verification' | 'complete'>('initial');
  const [setupResponse, setSetupResponse] = useState<MFASetupResponse | null>(null);
  const [verifyResponse, setVerifyResponse] = useState<MFAVerifyResponse | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    verificationCode?: string;
    form?: string;
  }>({});
  const [touched, setTouched] = useState({
    verificationCode: false
  });
  
  // Use external state if provided, otherwise use internal state
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : mfaIsLoading || isSubmitting;
  const formError: string | undefined = externalError !== undefined ? externalError : (mfaError ?? undefined);
  
  // Validate verification code
  const validateVerificationCode = () => {
    try {
      z.string()
        .min(6, 'Verification code must be at least 6 digits')
        .max(8, 'Verification code cannot be more than 8 digits')
        .regex(/^\d+$/, 'Verification code must contain only digits')
        .parse(verificationCode);
      setErrors({ ...errors, verificationCode: undefined });
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = { ...errors };
        error.errors.forEach((err) => {
          newErrors.verificationCode = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };
  
  // Check if form is valid
  const isValid = !errors.verificationCode && verificationCode.trim().length >= 6;
  
  // Handle field blur
  const handleBlur = () => {
    setTouched({ verificationCode: true });
    validateVerificationCode();
  };
  
  // Start MFA setup
  const handleStartSetup = async () => {
    setIsSubmitting(true);
    setErrors({ form: undefined });
    
    try {
      const response = await setupMFA();
      
      if (response.success) {
        setSetupResponse(response);
        setSetupState('qrcode');
      } else if (response.error) {
        setErrors({ form: response.error });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start MFA setup';
      setErrors({ form: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Verify MFA code
  const handleVerifyCode = async (e: FormEvent) => {
    e.preventDefault();
    
    // Reset form error
    setErrors({ ...errors, form: undefined });
    
    // Mark verification code as touched
    setTouched({ verificationCode: true });
    
    // Validate form
    const isCodeValid = validateVerificationCode();
    if (!isCodeValid) {
      return;
    }
    
    // Submit form
    setIsSubmitting(true);
    
    try {
      const response = await verifyMFA(verificationCode);
      
      if (response.success) {
        setVerifyResponse(response);
        setSetupState('complete');
        onSetupComplete?.(response);
      } else if (response.error) {
        setErrors({ ...errors, form: response.error });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify MFA code';
      setErrors({ ...errors, form: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle cancel
  const handleCancel = () => {
    setSetupState('initial');
    setSetupResponse(null);
    setVerifyResponse(null);
    setVerificationCode('');
    setErrors({});
    setTouched({ verificationCode: false });
    onCancel?.();
  };
  
  // If there's a form error from the MFA service, display it
  useEffect(() => {
    if (formError) {
      setErrors({ ...errors, form: formError });
    }
  }, [formError]);
  
  // Render the component using the render prop
  return render({
    setupState,
    handleStartSetup,
    handleVerifyCode,
    handleCancel,
    verificationCode,
    setVerificationCode,
    isLoading,
    isValid,
    qrCode: setupResponse?.qrCode,
    secret: setupResponse?.secret,
    backupCodes: verifyResponse?.backupCodes || setupResponse?.backupCodes,
    errors: {
      ...errors,
      form: errors.form || formError
    },
    touched,
    handleBlur
  });
}
