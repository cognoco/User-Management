/**
 * Headless Reset Password Form Component
 * 
 * This component handles the behavior of a password reset form without any UI rendering.
 * It follows the headless UI pattern using render props to allow complete UI customization.
 */

import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { api } from '@/lib/api/axios';
import { z } from 'zod';

export interface ResetPasswordFormProps {
  /**
   * Token received from the reset password email
   */
  token: string;
  
  /**
   * Called when the form is submitted with valid data
   */
  onSubmit?: (password: string, token: string) => Promise<void>;
  
  /**
   * Called when password reset is successful
   */
  onSuccess?: () => void;
  
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
    passwordValue: string;
    setPasswordValue: (value: string) => void;
    confirmPasswordValue: string;
    setConfirmPasswordValue: (value: string) => void;
    isSubmitting: boolean;
    isValid: boolean;
    isSuccess: boolean;
    errors: {
      password?: string;
      confirmPassword?: string;
      form?: string;
    };
    touched: {
      password: boolean;
      confirmPassword: boolean;
    };
    handleBlur: (field: 'password' | 'confirmPassword') => void;
  }) => React.ReactNode;
}

export function ResetPasswordForm({
  token,
  onSubmit,
  onSuccess,
  isLoading: externalIsLoading,
  error: externalError,
  onValidationChange,
  render
}: ResetPasswordFormProps) {
  // Get authentication hook
  const { resetPassword, isLoading: authIsLoading, error: authError } = useAuth();
  
  // Form state
  const [passwordValue, setPasswordValue] = useState('');
  const [confirmPasswordValue, setConfirmPasswordValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
    form?: string;
  }>({});
  const [touched, setTouched] = useState({
    password: false,
    confirmPassword: false
  });
  
  // Use external state if provided, otherwise use internal state
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : authIsLoading || isSubmitting;
  const formError = externalError !== undefined ? externalError : (authError ?? undefined);
  
  // Validate form
  const validateForm = () => {
    try {
      // Password validation
      z.string()
        .min(8, 'Password must be at least 8 characters')
        .parse(passwordValue);
      
      // Confirm password validation
      if (passwordValue !== confirmPasswordValue) {
        throw new Error("Passwords don't match");
      }
      
      setErrors({
        password: undefined,
        confirmPassword: undefined,
        form: undefined
      });
      
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = { ...errors };
        error.errors.forEach((err) => {
          if (err.path[0] === 'password') {
            newErrors.password = err.message;
          }
        });
        setErrors(newErrors);
      } else if (error instanceof Error) {
        setErrors({
          ...errors,
          confirmPassword: error.message
        });
      }
      return false;
    }
  };
  
  // Check if form is valid
  const isValid = !errors.password && 
    !errors.confirmPassword && 
    passwordValue.trim().length >= 8 && 
    confirmPasswordValue === passwordValue;
  
  // Notify parent of validation state changes
  useEffect(() => {
    onValidationChange?.(isValid);
  }, [isValid, onValidationChange]);
  
  // Handle field blur
  const handleBlur = (field: 'password' | 'confirmPassword') => {
    setTouched({ ...touched, [field]: true });
    
    // Validate the specific field
    try {
      if (field === 'password') {
        z.string().min(8, 'Password must be at least 8 characters').parse(passwordValue);
        setErrors({ ...errors, password: undefined });
      } else if (field === 'confirmPassword') {
        if (confirmPasswordValue !== passwordValue) {
          setErrors({ ...errors, confirmPassword: "Passwords don't match" });
        } else {
          setErrors({ ...errors, confirmPassword: undefined });
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = { ...errors };
        error.errors.forEach((err) => {
          if (field === 'password') {
            newErrors.password = err.message;
          }
        });
        setErrors(newErrors);
      }
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Reset form error
    setErrors({ ...errors, form: undefined });
    
    // Mark all fields as touched
    setTouched({
      password: true,
      confirmPassword: true
    });
    
    // Validate form
    const isFormValid = validateForm();
    if (!isFormValid) {
      return;
    }
    
    // Submit form
    setIsSubmitting(true);
    setIsSuccess(false);
    
    try {
      if (onSubmit) {
        // Use custom submit handler
        await onSubmit(passwordValue, token);
        setIsSuccess(true);
        onSuccess?.();
      } else {
        // Use default auth hook
        const res = await api.post('/auth/reset-password', { token, password: passwordValue });
        const result = res.data as { success: boolean; error?: string };
        
        if (result.error) {
          setErrors({ ...errors, form: result.error });
        } else {
          setIsSuccess(true);
          onSuccess?.();
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset password';
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
    passwordValue,
    setPasswordValue,
    confirmPasswordValue,
    setConfirmPasswordValue,
    isSubmitting: isLoading,
    isValid,
    isSuccess,
    errors: {
      ...errors,
      form: errors.form || formError
    },
    touched,
    handleBlur
  });
}

export default ResetPasswordForm;
