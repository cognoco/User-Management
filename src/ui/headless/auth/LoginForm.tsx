/**
 * Headless Login Form Component
 * 
 * This component handles the behavior of a login form without any UI rendering.
 * It follows the headless UI pattern using render props to allow complete UI customization.
 * 
 * ARCHITECTURE: This component is purely for form behavior and validation.
 * All business logic (authentication, error handling, navigation) should be 
 * provided via the onSubmit prop from a higher-level component or hook.
 */

import { useState, FormEvent, useEffect } from 'react';
import { LoginPayload, loginSchema } from '@/core/common/user-types';
import { z } from 'zod';

export interface LoginFormProps {
  /**
   * Called when the form is submitted with valid data
   * This should handle all business logic (authentication, navigation, error handling)
   */
  onSubmit: (credentials: LoginPayload) => Promise<void>;
  
  /**
   * Initial email value
   */
  initialEmail?: string;
  
  /**
   * Whether to show the remember me option
   */
  showRememberMe?: boolean;
  
  /**
   * External loading state (overrides internal state if provided)
   */
  isLoading?: boolean;
  
  /**
   * External error message (overrides internal state if provided)
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
    emailValue: string;
    setEmailValue: (value: string) => void;
    passwordValue: string;
    setPasswordValue: (value: string) => void;
    rememberMeValue: boolean;
    setRememberMeValue: (value: boolean) => void;
    isSubmitting: boolean;
    isValid: boolean;
    errors: {
      email?: string;
      password?: string;
      form?: string;
    };
    touched: {
      email: boolean;
      password: boolean;
    };
    handleBlur: (field: 'email' | 'password') => void;
  }) => React.ReactNode;
}

export function LoginForm({
  onSubmit,
  initialEmail = '',
  showRememberMe = true,
  isLoading: externalIsLoading,
  error: externalError,
  onValidationChange,
  render
}: LoginFormProps) {
  // Form state
  const [emailValue, setEmailValue] = useState(initialEmail);
  const [passwordValue, setPasswordValue] = useState('');
  const [rememberMeValue, setRememberMeValue] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    form?: string;
  }>({});
  const [touched, setTouched] = useState({
    email: false,
    password: false
  });
  
  // Use external state if provided, otherwise use internal state
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : isSubmitting;
  
  // Validate form
  const validateForm = () => {
    try {
      loginSchema.parse({
        email: emailValue,
        password: passwordValue,
        rememberMe: rememberMeValue
      });
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };
  
  // Check if form is valid
  const isValid = !errors.email && !errors.password && emailValue.trim() !== '' && passwordValue.trim() !== '';
  
  // Notify parent of validation state changes
  useEffect(() => {
    onValidationChange?.(isValid);
  }, [isValid, onValidationChange]);
  
  // Handle field blur
  const handleBlur = (field: 'email' | 'password') => {
    setTouched({ ...touched, [field]: true });
    
    // Validate the specific field
    try {
      if (field === 'email') {
        z.string().email('Please enter a valid email address').parse(emailValue);
        setErrors({ ...errors, email: undefined });
      } else if (field === 'password') {
        z.string().min(1, 'Password is required').parse(passwordValue);
        setErrors({ ...errors, password: undefined });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = { ...errors };
        error.errors.forEach((err) => {
          if (field === 'email' || field === 'password') {
            newErrors[field] = err.message;
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
      email: true,
      password: true
    });
    
    // Validate form
    const isFormValid = validateForm();
    if (!isFormValid) {
      return;
    }
    
    // Prepare credentials
    const credentials: LoginPayload = {
      email: emailValue,
      password: passwordValue,
      rememberMe: Boolean(rememberMeValue)
    };
    
    // Submit form - delegate all business logic to the onSubmit prop
    setIsSubmitting(true);
    
    try {
      await onSubmit(credentials);
    } catch (error) {
      // Only handle UI-related form errors here
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setErrors({ ...errors, form: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Display external error if provided
  useEffect(() => {
    if (externalError) {
      setErrors({ ...errors, form: externalError });
    }
  }, [externalError, errors]);
  
  // Render the component using the render prop
  return render({
    handleSubmit,
    emailValue,
    setEmailValue,
    passwordValue,
    setPasswordValue,
    rememberMeValue,
    setRememberMeValue,
    isSubmitting: isLoading,
    isValid,
    errors: {
      ...errors,
      form: errors.form || externalError || undefined
    },
    touched,
    handleBlur
  });
}
