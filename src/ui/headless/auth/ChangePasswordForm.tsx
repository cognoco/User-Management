import { ReactNode, useState, FormEvent } from 'react';
import { z } from 'zod';
import { useAuth } from '@/hooks/auth/useAuth';

/**
 * Zod schema for changing password
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: 'Current password is required.' }),
  newPassword: z.string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'New password must contain at least one number')
    .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, 'New password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'New passwords do not match',
  path: ['confirmPassword'], 
}).refine(data => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from the current password.',
  path: ['newPassword'],
});

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

/**
 * Props for the headless ChangePasswordForm component
 */
export interface ChangePasswordFormProps {
  /**
   * Custom onSubmit handler. If not provided, the default auth service will be used.
   */
  onSubmit?: (data: ChangePasswordFormValues) => Promise<void>;
  
  /**
   * Custom loading state. If not provided, internal state is used.
   */
  isLoading?: boolean;
  
  /**
   * Custom error message. If not provided, internal state is used.
   */
  error?: string;
  
  /**
   * Callback when form validation state changes
   */
  onValidationChange?: (isValid: boolean) => void;
  
  /**
   * Callback when password is successfully changed
   */
  onSuccess?: (message: string) => void;
  
  /**
   * Render prop function that receives form state and handlers
   */
  children: (props: ChangePasswordFormRenderProps) => ReactNode;
}

/**
 * Render props passed to the children function
 */
export interface ChangePasswordFormRenderProps {
  /**
   * Form submission handler
   */
  handleSubmit: (e: FormEvent) => void;
  
  /**
   * Current password value
   */
  currentPasswordValue: string;
  
  /**
   * Set current password value
   */
  setCurrentPasswordValue: (value: string) => void;
  
  /**
   * New password value
   */
  newPasswordValue: string;
  
  /**
   * Set new password value
   */
  setNewPasswordValue: (value: string) => void;
  
  /**
   * Confirm password value
   */
  confirmPasswordValue: string;
  
  /**
   * Set confirm password value
   */
  setConfirmPasswordValue: (value: string) => void;
  
  /**
   * Whether the form is submitting
   */
  isSubmitting: boolean;
  
  /**
   * Whether the form is valid
   */
  isValid: boolean;
  
  /**
   * Form validation errors
   */
  errors: {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
    form?: string;
  };
  
  /**
   * Fields that have been touched/blurred
   */
  touched: {
    currentPassword: boolean;
    newPassword: boolean;
    confirmPassword: boolean;
  };
  
  /**
   * Handle field blur
   */
  handleBlur: (field: 'currentPassword' | 'newPassword' | 'confirmPassword') => void;
  
  /**
   * Success message if password was changed successfully
   */
  successMessage: string | null;
}

/**
 * Headless ChangePasswordForm component that handles behavior only
 * This follows the headless UI pattern from the architecture guidelines
 */
export const ChangePasswordForm = ({
  onSubmit,
  isLoading: externalIsLoading,
  error: externalError,
  onValidationChange,
  onSuccess,
  children
}: ChangePasswordFormProps) => {
  // Get auth service
  const { updatePassword, isLoading: authIsLoading, error: authError } = useAuth();
  
  // Form state
  const [currentPasswordValue, setCurrentPasswordValue] = useState('');
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [confirmPasswordValue, setConfirmPasswordValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
    form?: string;
  }>({});
  const [touched, setTouched] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Use external state if provided, otherwise use internal state
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : authIsLoading || isSubmitting;
  const formError = externalError !== undefined ? externalError : (authError ?? undefined);
  
  // Validate form
  const validateForm = () => {
    try {
      changePasswordSchema.parse({
        currentPassword: currentPasswordValue,
        newPassword: newPasswordValue,
        confirmPassword: confirmPasswordValue
      });
      setErrors({});
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
  const isValid = !errors.currentPassword && 
                 !errors.newPassword && 
                 !errors.confirmPassword && 
                 currentPasswordValue.trim() !== '' && 
                 newPasswordValue.trim() !== '' &&
                 confirmPasswordValue.trim() !== '';
  
  // Notify parent of validation state changes
  useState(() => {
    onValidationChange?.(isValid);
  });
  
  // Handle field blur
  const handleBlur = (field: 'currentPassword' | 'newPassword' | 'confirmPassword') => {
    setTouched({ ...touched, [field]: true });
    
    // Validate the specific field
    try {
      if (field === 'currentPassword') {
        z.string().min(1, 'Current password is required').parse(currentPasswordValue);
        setErrors({ ...errors, currentPassword: undefined });
      } else if (field === 'newPassword') {
        z.string()
          .min(8, 'New password must be at least 8 characters')
          .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
          .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
          .regex(/[0-9]/, 'New password must contain at least one number')
          .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, 'New password must contain at least one special character')
          .parse(newPasswordValue);
        
        // Also check if new password is different from current
        if (currentPasswordValue === newPasswordValue) {
          setErrors({ 
            ...errors, 
            newPassword: 'New password must be different from the current password.' 
          });
        } else {
          setErrors({ ...errors, newPassword: undefined });
        }
      } else if (field === 'confirmPassword') {
        if (confirmPasswordValue !== newPasswordValue) {
          setErrors({ ...errors, confirmPassword: 'New passwords do not match' });
        } else {
          setErrors({ ...errors, confirmPassword: undefined });
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = { ...errors };
        error.errors.forEach((err) => {
          if (field === 'currentPassword' || field === 'newPassword' || field === 'confirmPassword') {
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
    
    // Reset form error and success message
    setErrors({ ...errors, form: undefined });
    setSuccessMessage(null);
    
    // Mark all fields as touched
    setTouched({
      currentPassword: true,
      newPassword: true,
      confirmPassword: true
    });
    
    // Validate form
    const isFormValid = validateForm();
    if (!isFormValid) {
      return;
    }
    
    // Prepare data
    const data: ChangePasswordFormValues = {
      currentPassword: currentPasswordValue,
      newPassword: newPasswordValue,
      confirmPassword: confirmPasswordValue
    };
    
    // Submit form
    setIsSubmitting(true);
    
    try {
      if (onSubmit) {
        // Use custom submit handler
        await onSubmit(data);
        setSuccessMessage('Password updated successfully!');
        onSuccess?.('Password updated successfully!');
      } else {
        // Use default auth hook
        const result = await updatePassword(data.currentPassword, data.newPassword);
        
        if (result.error) {
          setErrors({ ...errors, form: result.error });
        } else {
          const message = 'Password updated successfully!';
          setSuccessMessage(message);
          onSuccess?.(message);
          
          // Reset form on success
          setCurrentPasswordValue('');
          setNewPasswordValue('');
          setConfirmPasswordValue('');
          setTouched({
            currentPassword: false,
            newPassword: false,
            confirmPassword: false
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update password';
      setErrors({ ...errors, form: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Render the component using the render prop
  return children({
    handleSubmit,
    currentPasswordValue,
    setCurrentPasswordValue,
    newPasswordValue,
    setNewPasswordValue,
    confirmPasswordValue,
    setConfirmPasswordValue,
    isSubmitting: isLoading,
    isValid,
    errors: {
      ...errors,
      form: errors.form || formError
    },
    touched,
    handleBlur,
    successMessage
  });
};

export default ChangePasswordForm;
