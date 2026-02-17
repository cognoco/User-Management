import { ReactNode, useState, useEffect, FormEvent, useTransition } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { LoginPayload, loginSchema } from '@/core/auth/models';
import { z } from 'zod';

/**
 * Headless LoginFormReact19 component that handles behavior only
 * This follows the headless UI pattern from the architecture guidelines
 * This version is optimized for React 19 features like useTransition
 */
export interface LoginFormReact19Props {
  /**
   * Called when the form is submitted with valid data
   */
  onSubmit?: (credentials: LoginPayload) => Promise<void>;
  
  /**
   * Initial email value
   */
  initialEmail?: string;
  
  /**
   * Whether to show the remember me option
   */
  showRememberMe?: boolean;
  
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
  children: (props: LoginFormReact19RenderProps) => ReactNode;
}

export interface LoginFormReact19RenderProps {
  /**
   * Handle form submission
   */
  handleSubmit: (e: FormEvent) => void;
  
  /**
   * Current email value
   */
  emailValue: string;
  
  /**
   * Set email value
   */
  setEmailValue: (value: string) => void;
  
  /**
   * Current password value
   */
  passwordValue: string;
  
  /**
   * Set password value
   */
  setPasswordValue: (value: string) => void;
  
  /**
   * Current remember me value
   */
  rememberMeValue: boolean;
  
  /**
   * Set remember me value
   */
  setRememberMeValue: (value: boolean) => void;
  
  /**
   * Whether the form is currently submitting
   */
  isSubmitting: boolean;
  
  /**
   * Whether the form is valid
   */
  isValid: boolean;
  
  /**
   * Whether the form is in a pending state (React 19 useTransition)
   */
  isPending: boolean;
  
  /**
   * Form errors
   */
  errors: {
    email?: string;
    password?: string;
    form?: string;
  };
  
  /**
   * Whether fields have been touched
   */
  touched: {
    email: boolean;
    password: boolean;
  };
  
  /**
   * Handle field blur
   */
  handleBlur: (field: 'email' | 'password') => void;
}

export const LoginFormReact19 = ({
  onSubmit,
  initialEmail = '',
  showRememberMe = true,
  isLoading: externalIsLoading,
  error: externalError,
  onValidationChange,
  children
}: LoginFormReact19Props) => {
  // Get authentication hook
  const { login, isLoading: authIsLoading, error: authError } = useAuth();
  
  // Use React 19's useTransition for improved UX
  const [isPending, startTransition] = useTransition();
  
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
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : authIsLoading || isSubmitting;
  const formError = externalError !== undefined ? externalError : (authError ?? undefined);
  
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
      rememberMe: rememberMeValue
    };
    
    // Submit form using React 19's startTransition for improved UX
    setIsSubmitting(true);
    
    startTransition(async () => {
      try {
        if (onSubmit) {
          // Use custom submit handler
          await onSubmit(credentials);
        } else {
          // Use default auth hook
          const result = await login(credentials.email, credentials.password, credentials.rememberMe);
          
          if (result.error) {
            setErrors({ ...errors, form: result.error });
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Login failed';
        setErrors({ ...errors, form: errorMessage });
      } finally {
        setIsSubmitting(false);
      }
    });
  };
  
  // If there's a form error from the auth service, display it
  useEffect(() => {
    if (formError) {
      setErrors({ ...errors, form: formError });
    }
  }, [formError]);
  
  // Prepare render props
  const renderProps: LoginFormReact19RenderProps = {
    handleSubmit,
    emailValue,
    setEmailValue,
    passwordValue,
    setPasswordValue,
    rememberMeValue,
    setRememberMeValue,
    isSubmitting: isLoading,
    isValid,
    isPending,
    errors: {
      ...errors,
      form: errors.form || formError
    },
    touched,
    handleBlur
  };
  
  return children(renderProps);
};

export default LoginFormReact19;
