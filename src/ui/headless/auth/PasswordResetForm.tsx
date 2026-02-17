/**
 * Headless Password Reset Form Component
 * 
 * This component handles the behavior of a password reset form without any UI rendering.
 * It follows the headless UI pattern using render props to allow complete UI customization.
 */

import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { z } from 'zod';

export interface PasswordResetFormProps {
  /**
   * Called when the form is submitted with valid data
   */
  onSubmit?: (email: string) => Promise<void>;
  
  /**
   * Initial email value
   */
  initialEmail?: string;
  
  /**
   * Custom loading state (if not provided, internal state is used)
   */
  isLoading?: boolean;
  
  /**
   * Custom error message (if not provided, internal state is used)
   */
  error?: string;
  
  /**
   * Custom success message (if not provided, internal state is used)
   */
  successMessage?: string;
  
  /**
   * Callback when form validation state changes
   */
  onValidationChange?: (isValid: boolean) => void;
  
  /**
   * Render prop function that receives form state and handlers
   */
  render: (props: {
    handleSubmit: (e: FormEvent) => void;
    emailValue: string;
    setEmailValue: (value: string) => void;
    isSubmitting: boolean;
    isValid: boolean;
    isSuccess: boolean;
    errors: {
      email?: string;
      form?: string;
    };
    successMessage?: string;
    touched: {
      email: boolean;
    };
    handleBlur: (field: 'email') => void;
  }) => React.ReactNode;
}

export function PasswordResetForm({
  onSubmit,
  initialEmail = '',
  isLoading: externalIsLoading,
  error: externalError,
  successMessage: externalSuccessMessage,
  onValidationChange,
  render
}: PasswordResetFormProps) {
  // Get authentication hook
  const { resetPassword, isLoading: authIsLoading, error: authError, successMessage: authSuccessMessage } = useAuth();
  
  // Form state
  const [emailValue, setEmailValue] = useState(initialEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    form?: string;
  }>({});
  const [touched, setTouched] = useState({
    email: false
  });
  
  // Use external state if provided, otherwise use internal state
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : authIsLoading || isSubmitting;
  const formError = externalError !== undefined ? externalError : (authError ?? undefined);
  const formSuccessMessage: string | undefined = externalSuccessMessage !== undefined ? externalSuccessMessage : (authSuccessMessage ?? undefined);
  
  // Validate email
  const validateEmail = () => {
    try {
      z.string().email('Please enter a valid email address').parse(emailValue);
      setErrors({ ...errors, email: undefined });
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = { ...errors };
        error.errors.forEach((err) => {
          newErrors.email = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };
  
  // Check if form is valid
  const isValid = !errors.email && emailValue.trim() !== '';
  
  // Notify parent of validation state changes
  useEffect(() => {
    onValidationChange?.(isValid);
  }, [isValid, onValidationChange]);
  
  // Handle field blur
  const handleBlur = (field: 'email') => {
    setTouched({ ...touched, [field]: true });
    validateEmail();
  };
  
  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Reset form error and success state
    setErrors({ ...errors, form: undefined });
    setIsSuccess(false);
    
    // Mark email as touched
    setTouched({ email: true });
    
    // Validate form
    const isEmailValid = validateEmail();
    if (!isEmailValid) {
      return;
    }
    
    // Submit form
    setIsSubmitting(true);
    
    try {
      if (onSubmit) {
        // Use custom submit handler
        await onSubmit(emailValue);
        setIsSuccess(true);
      } else {
        // Use default auth hook
        const result = await resetPassword(emailValue);
        
        if (result.error) {
          setErrors({ ...errors, form: result.error });
        } else if (result.success) {
          setIsSuccess(true);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset request failed';
      setErrors({ ...errors, form: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
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
    emailValue,
    setEmailValue,
    isSubmitting: isLoading,
    isValid,
    isSuccess,
    errors: {
      ...errors,
      form: errors.form || formError
    },
    successMessage: formSuccessMessage,
    touched,
    handleBlur
  });
}
