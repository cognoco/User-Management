/**
 * Headless MFA Verification Form Component
 * 
 * This component handles the behavior of MFA verification without any UI rendering.
 * It follows the headless UI pattern using render props to allow complete UI customization.
 */

import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { z } from 'zod';

export interface MFAVerificationFormProps {
  /**
   * Session ID or token from the initial login attempt
   */
  sessionId: string;
  
  /**
   * Called when MFA verification is successful
   */
  onSuccess?: () => void;
  
  /**
   * Called when the user wants to use a backup code instead
   */
  onUseBackupCode?: () => void;
  
  /**
   * Custom loading state (if not provided, internal state is used)
   */
  isLoading?: boolean;
  
  /**
   * Custom error message (if not provided, internal state is used)
   */
  error?: string;
  
  /**
   * Callback when form validation state changes
   */
  onValidationChange?: (isValid: boolean) => void;
  
  /**
   * Render prop function that receives form state and handlers
   */
  render: (props: {
    handleSubmit: (e: FormEvent) => void;
    handleUseBackupCode: () => void;
    verificationCode: string;
    setVerificationCode: (value: string) => void;
    isSubmitting: boolean;
    isValid: boolean;
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

export function MFAVerificationForm({
  sessionId,
  onSuccess,
  onUseBackupCode,
  isLoading: externalIsLoading,
  error: externalError,
  onValidationChange,
  render
}: MFAVerificationFormProps) {
  // Get authentication hook
  const { verifyMFA, isLoading: authIsLoading, error: authError } = useAuth();
  
  // Form state
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
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : authIsLoading || isSubmitting;
  const formError = externalError !== undefined ? externalError : (authError ?? undefined);
  
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
  
  // Notify parent of validation state changes
  useEffect(() => {
    onValidationChange?.(isValid);
  }, [isValid, onValidationChange]);
  
  // Handle field blur
  const handleBlur = () => {
    setTouched({ verificationCode: true });
    validateVerificationCode();
  };
  
  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
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
      const result = await verifyMFA(verificationCode, false);
      
      if (result.success) {
        onSuccess?.();
      } else if (result.error) {
        setErrors({ ...errors, form: result.error });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify MFA code';
      setErrors({ ...errors, form: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle use backup code
  const handleUseBackupCode = () => {
    onUseBackupCode?.();
  };
  
  // If there's a form error from the auth service, display it
  useEffect(() => {
    if (formError) {
      setErrors({ ...errors, form: formError });
    }
  }, [formError]);
  
  // Render the component using the render prop
  return render({
    handleSubmit,
    handleUseBackupCode,
    verificationCode,
    setVerificationCode,
    isSubmitting: isLoading,
    isValid,
    errors: {
      ...errors,
      form: errors.form || formError
    },
    touched,
    handleBlur
  });
}

export default MFAVerificationForm;
