/**
 * Headless Registration Form Component
 * 
 * This component handles the behavior of a registration form without any UI rendering.
 * It follows the headless UI pattern using render props to allow complete UI customization.
 */

import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { RegistrationPayload, registrationSchema as registerSchema } from '@/core/common/user-types';
import { z } from 'zod';

export interface RegistrationFormProps {
  /**
   * Called when the form is submitted with valid data
   */
  onSubmit?: (userData: RegistrationPayload) => Promise<void>;
  
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
    confirmPasswordValue: string;
    setConfirmPasswordValue: (value: string) => void;
    firstNameValue: string;
    setFirstNameValue: (value: string) => void;
    lastNameValue: string;
    setLastNameValue: (value: string) => void;
    acceptTermsValue: boolean;
    setAcceptTermsValue: (value: boolean) => void;
    isSubmitting: boolean;
    isValid: boolean;
    errors: {
      email?: string;
      password?: string;
      confirmPassword?: string;
      firstName?: string;
      lastName?: string;
      acceptTerms?: string;
      form?: string;
    };
    touched: {
      email: boolean;
      password: boolean;
      confirmPassword: boolean;
      firstName: boolean;
      lastName: boolean;
      acceptTerms: boolean;
    };
    handleBlur: (field: 'email' | 'password' | 'confirmPassword' | 'firstName' | 'lastName' | 'acceptTerms') => void;
  }) => React.ReactNode;
}

export function RegistrationForm({
  onSubmit,
  initialEmail = '',
  isLoading: externalIsLoading,
  error: externalError,
  onValidationChange,
  render
}: RegistrationFormProps) {
  // Get authentication hook
  const { register, isLoading: authIsLoading, error: authError } = useAuth();
  
  // Form state
  const [emailValue, setEmailValue] = useState(initialEmail);
  const [passwordValue, setPasswordValue] = useState('');
  const [confirmPasswordValue, setConfirmPasswordValue] = useState('');
  const [firstNameValue, setFirstNameValue] = useState('');
  const [lastNameValue, setLastNameValue] = useState('');
  const [acceptTermsValue, setAcceptTermsValue] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    firstName?: string;
    lastName?: string;
    acceptTerms?: string;
    form?: string;
  }>({});
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    confirmPassword: false,
    firstName: false,
    lastName: false,
    acceptTerms: false
  });
  
  // Use external state if provided, otherwise use internal state
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : authIsLoading || isSubmitting;
  const formError = externalError !== undefined ? externalError : authError;
  
  // Validate form
  const validateForm = () => {
    try {
      registerSchema.parse({
        email: emailValue,
        password: passwordValue,
        confirmPassword: confirmPasswordValue,
        firstName: firstNameValue,
        lastName: lastNameValue,
        acceptTerms: acceptTermsValue
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
        
        // Debug logging to help identify validation issues
        console.log('[RegistrationForm] Validation failed:', {
          errors: newErrors,
          formData: {
            email: emailValue,
            password: passwordValue ? '***' : '',
            confirmPassword: confirmPasswordValue ? '***' : '',
            firstName: firstNameValue,
            lastName: lastNameValue,
            acceptTerms: acceptTermsValue
          }
        });
        
        setErrors(newErrors);
      }
      return false;
    }
  };
  
  // Check if form is valid
  const isValid = !Object.values(errors).some(Boolean) && 
    emailValue.trim() !== '' && 
    passwordValue.trim() !== '' && 
    confirmPasswordValue.trim() !== '' && 
    firstNameValue.trim() !== '' && 
    lastNameValue.trim() !== '' && 
    acceptTermsValue === true;
  
  // Notify parent of validation state changes
  useEffect(() => {
    onValidationChange?.(isValid);
  }, [isValid, onValidationChange]);
  
  // Handle field blur
  const handleBlur = (field: 'email' | 'password' | 'confirmPassword' | 'firstName' | 'lastName' | 'acceptTerms') => {
    setTouched({ ...touched, [field]: true });
    
    // Validate the specific field
    try {
      if (field === 'email') {
        z.string().email('Please enter a valid email address').parse(emailValue);
        setErrors({ ...errors, email: undefined });
      } else if (field === 'password') {
        z.string().min(8, 'Password must be at least 8 characters').parse(passwordValue);
        setErrors({ ...errors, password: undefined });
      } else if (field === 'confirmPassword') {
        if (confirmPasswordValue !== passwordValue) {
          setErrors({ ...errors, confirmPassword: "Passwords don't match" });
        } else {
          setErrors({ ...errors, confirmPassword: undefined });
        }
      } else if (field === 'firstName') {
        z.string().min(1, 'First name is required').parse(firstNameValue);
        setErrors({ ...errors, firstName: undefined });
      } else if (field === 'lastName') {
        z.string().min(1, 'Last name is required').parse(lastNameValue);
        setErrors({ ...errors, lastName: undefined });
      } else if (field === 'acceptTerms') {
        if (!acceptTermsValue) {
          setErrors({ ...errors, acceptTerms: 'You must accept the terms and conditions' });
        } else {
          setErrors({ ...errors, acceptTerms: undefined });
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = { ...errors };
        error.errors.forEach((err) => {
          if (field === 'email' || field === 'password' || field === 'firstName' || field === 'lastName') {
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
      password: true,
      confirmPassword: true,
      firstName: true,
      lastName: true,
      acceptTerms: true
    });
    
    // Validate form
    const isFormValid = validateForm();
    if (!isFormValid) {
      return;
    }
    
    // Prepare user data
    const userData: RegistrationPayload & { acceptTerms: boolean; confirmPassword: string } = {
      email: emailValue,
      password: passwordValue,
      confirmPassword: confirmPasswordValue,
      firstName: firstNameValue,
      lastName: lastNameValue,
      acceptTerms: acceptTermsValue,
      metadata: {
        acceptedTerms: acceptTermsValue
      }
    };
    
    // Submit form
    setIsSubmitting(true);
    
    try {
      if (onSubmit) {
        // Use custom submit handler
        await onSubmit(userData);
      } else {
        // Use default auth hook
        const result = await register(userData);
        
        if (result.error) {
          setErrors({ ...errors, form: result.error });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      console.log('[RegistrationForm] Submit error:', {
        error: errorMessage,
        originalError: error,
        formData: {
          email: emailValue,
          firstName: firstNameValue,
          lastName: lastNameValue,
          acceptTerms: acceptTermsValue
        }
      });
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
    passwordValue,
    setPasswordValue,
    confirmPasswordValue,
    setConfirmPasswordValue,
    firstNameValue,
    setFirstNameValue,
    lastNameValue,
    setLastNameValue,
    acceptTermsValue,
    setAcceptTermsValue,
    isSubmitting: isLoading,
    isValid,
    errors: {
      ...errors,
      form: errors.form || formError || undefined
    },
    touched,
    handleBlur
  });
}
