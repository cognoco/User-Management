/**
 * Headless Team Creator Component
 * 
 * This component handles the behavior of a team creation form without any UI rendering.
 * It follows the headless UI pattern using render props to allow complete UI customization.
 */

import { useState, FormEvent, useEffect } from 'react';
import { useTeams } from '@/hooks/team/useTeams';
import { useAuth } from '@/hooks/auth/useAuth';
import { TeamCreatePayload, TeamVisibility } from '@/core/team/models';
import { z } from 'zod';

export interface TeamCreatorProps {
  /**
   * Called when the form is submitted with valid data
   */
  onSubmit?: (teamData: TeamCreatePayload) => Promise<void>;
  
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
    nameValue: string;
    setNameValue: (value: string) => void;
    descriptionValue: string;
    setDescriptionValue: (value: string) => void;
    isPublicValue: boolean;
    setIsPublicValue: (value: boolean) => void;
    isSubmitting: boolean;
    isValid: boolean;
    errors: {
      name?: string;
      description?: string;
      form?: string;
    };
    successMessage?: string;
    touched: {
      name: boolean;
      description: boolean;
    };
    handleBlur: (field: 'name' | 'description') => void;
    resetForm: () => void;
  }) => React.ReactNode;
}

// Team validation schema
const teamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100, 'Team name cannot exceed 100 characters'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  isPublic: z.boolean().optional(),
});

export function TeamCreator({
  onSubmit,
  isLoading: externalIsLoading,
  error: externalError,
  successMessage: externalSuccessMessage,
  onValidationChange,
  render
}: TeamCreatorProps) {
  // Get teams hook
  const { createTeam, isLoading: teamsIsLoading, error: teamsError, successMessage: teamsSuccessMessage } = useTeams();
  
  // Get current user from auth hook
  const { user } = useAuth();
  
  // Form state
  const [nameValue, setNameValue] = useState('');
  const [descriptionValue, setDescriptionValue] = useState('');
  const [isPublicValue, setIsPublicValue] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    description?: string;
    form?: string;
  }>({});
  const [touched, setTouched] = useState({
    name: false,
    description: false
  });
  
  // Use external state if provided, otherwise use internal state
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : teamsIsLoading || isSubmitting;
  const formError = externalError !== undefined ? externalError : teamsError;
  const formSuccessMessage = externalSuccessMessage !== undefined ? externalSuccessMessage : teamsSuccessMessage;
  
  // Reset form
  const resetForm = () => {
    setNameValue('');
    setDescriptionValue('');
    setIsPublicValue(false);
    setErrors({});
    setTouched({
      name: false,
      description: false
    });
  };
  
  // Validate form
  const validateForm = () => {
    try {
      teamSchema.parse({
        name: nameValue,
        description: descriptionValue,
        isPublic: isPublicValue
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
  const isValid = !errors.name && !errors.description && nameValue.trim() !== '';
  
  // Notify parent of validation state changes
  useEffect(() => {
    onValidationChange?.(isValid);
  }, [isValid, onValidationChange]);
  
  // Handle field blur
  const handleBlur = (field: 'name' | 'description') => {
    setTouched({ ...touched, [field]: true });
    
    // Validate the specific field
    try {
      if (field === 'name') {
        z.string().min(1, 'Team name is required').max(100, 'Team name cannot exceed 100 characters').parse(nameValue);
        setErrors({ ...errors, name: undefined });
      } else if (field === 'description') {
        z.string().max(500, 'Description cannot exceed 500 characters').parse(descriptionValue);
        setErrors({ ...errors, description: undefined });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = { ...errors };
        error.errors.forEach((err) => {
          if (field === 'name' || field === 'description') {
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
    
    // Mark fields as touched
    setTouched({
      name: true,
      description: true
    });
    
    // Validate form
    const isFormValid = validateForm();
    if (!isFormValid) {
      return;
    }
    
    // Prepare team data
    const teamData: TeamCreatePayload = {
      name: nameValue,
      description: descriptionValue || undefined,
      visibility: isPublicValue ? TeamVisibility.PUBLIC : TeamVisibility.PRIVATE
    };
    
    // Submit form
    setIsSubmitting(true);
    
    try {
      if (onSubmit) {
        // Use custom submit handler
        await onSubmit(teamData);
        resetForm();
      } else if (user?.id) {
        // Use default teams hook
        const result = await createTeam(user.id, teamData);
        
        if (result.success && result.team) {
          resetForm();
        } else if (result.error) {
          setErrors({ ...errors, form: result.error });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create team';
      setErrors({ ...errors, form: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // If there's a form error from the teams service, display it
  useEffect(() => {
    if (formError) {
      setErrors({ ...errors, form: formError });
    }
  }, [formError]);
  
  // Render the component using the render prop
  return render({
    handleSubmit,
    nameValue,
    setNameValue,
    descriptionValue,
    setDescriptionValue,
    isPublicValue,
    setIsPublicValue,
    isSubmitting: isLoading,
    isValid,
    errors: {
      ...errors,
      form: errors.form || formError || undefined
    },
    successMessage: formSuccessMessage ?? undefined,
    touched,
    handleBlur,
    resetForm
  });
}
