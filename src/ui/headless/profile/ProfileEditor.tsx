/**
 * Headless Profile Editor Component
 * 
 * This component handles the behavior of a profile editor without any UI rendering.
 * It follows the headless UI pattern using render props to allow complete UI customization.
 */

import { useState, FormEvent, useEffect } from 'react';
import { useUserProfile } from '@/hooks/user/useUserProfile';
import { useAuth } from '@/hooks/auth/useAuth';
import { ProfileUpdatePayload, UserProfile } from '@/core/user/models';
import { z } from 'zod';

export interface ProfileEditorProps {
  /**
   * Called when the form is submitted with valid data
   */
  onSubmit?: (profileData: ProfileUpdatePayload) => Promise<void>;
  
  /**
   * Initial profile data (if not provided, the current user's profile is used)
   */
  initialProfile?: Partial<UserProfile>;
  
  /**
   * Whether to show company information fields
   */
  showCompanyInfo?: boolean;
  
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
    handleUploadProfilePicture: (file: Blob) => Promise<void>;
    handleDeleteProfilePicture: () => Promise<void>;
    profile: UserProfile | null;
    formValues: {
      username: string;
      firstName: string;
      lastName: string;
      company: {
        name: string;
        size: string;
        industry: string;
        website: string;
        position: string;
        department: string;
        vatId: string;
        address: {
          street: string;
          city: string;
          state: string;
          postalCode: string;
          country: string;
        };
      };
    };
    setFormValue: (field: string, value: string) => void;
    setCompanyValue: (field: string, value: string) => void;
    setAddressValue: (field: string, value: string) => void;
    isSubmitting: boolean;
    isValid: boolean;
    errors: {
      username?: string;
      firstName?: string;
      lastName?: string;
      company?: {
        name?: string;
        website?: string;
        vatId?: string;
      };
      form?: string;
    };
    successMessage?: string;
    touched: Record<string, boolean>;
    handleBlur: (field: string) => void;
    isDirty: boolean;
    resetForm: () => void;
  }) => React.ReactNode;
}

// Profile validation schema
const profileSchema = z.object({
  username: z.string().optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  company: z.object({
    name: z.string().optional(),
    size: z.string().optional(),
    industry: z.string().optional(),
    website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
    position: z.string().optional(),
    department: z.string().optional(),
    vatId: z.string().optional(),
    address: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    }).optional(),
  }).optional(),
});

export function ProfileEditor({
  onSubmit,
  initialProfile,
  showCompanyInfo = true,
  isLoading: externalIsLoading,
  error: externalError,
  successMessage: externalSuccessMessage,
  onValidationChange,
  render
}: ProfileEditorProps) {
  // Get user profile hook
  const { 
    profile: currentProfile, 
    updateProfile, 
    uploadProfilePicture, 
    deleteProfilePicture,
    isLoading: profileIsLoading, 
    error: profileError,
    successMessage: profileSuccessMessage
  } = useUserProfile();
  
  // Get current user from auth hook
  const { user } = useAuth();
  
  // Initialize form values from profile or initial data
  const [formValues, setFormValues] = useState({
    username: '',
    firstName: '',
    lastName: '',
    company: {
      name: '',
      size: '',
      industry: '',
      website: '',
      position: '',
      department: '',
      vatId: '',
      address: {
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
      },
    },
  });
  
  // Track original values to determine if form is dirty
  const [originalValues, setOriginalValues] = useState(formValues);
  
  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    firstName?: string;
    lastName?: string;
    company?: {
      name?: string;
      website?: string;
      vatId?: string;
    };
    form?: string;
  }>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  // Use external state if provided, otherwise use internal state
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : profileIsLoading || isSubmitting;
  const formError: string | undefined = externalError !== undefined ? externalError : (profileError ?? undefined);
  const formSuccessMessage: string | undefined = externalSuccessMessage !== undefined ? externalSuccessMessage : (profileSuccessMessage ?? undefined);
  
  // Update form values when profile changes
  useEffect(() => {
    const profile = initialProfile || currentProfile;
    if (profile) {
      const newFormValues = {
        username: profile.username || '',
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        company: {
          name: profile.company?.name || '',
          size: profile.company?.size || '',
          industry: profile.company?.industry || '',
          website: profile.company?.website || '',
          position: profile.company?.position || '',
          department: profile.company?.department || '',
          vatId: profile.company?.vatId || '',
          address: {
            street: profile.company?.address?.street || '',
            city: profile.company?.address?.city || '',
            state: profile.company?.address?.state || '',
            postalCode: profile.company?.address?.postalCode || '',
            country: profile.company?.address?.country || '',
          },
        },
      };
      
      setFormValues(newFormValues);
      setOriginalValues(newFormValues);
    }
  }, [initialProfile, currentProfile]);
  
  // Set a specific form value
  const setFormValue = (field: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  
  // Set a specific company value
  const setCompanyValue = (field: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      company: {
        ...prev.company,
        [field]: value,
      },
    }));
  };
  
  // Set a specific address value
  const setAddressValue = (field: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      company: {
        ...prev.company,
        address: {
          ...prev.company.address,
          [field]: value,
        },
      },
    }));
  };
  
  // Reset form to original values
  const resetForm = () => {
    setFormValues(originalValues);
    setErrors({});
    setTouched({});
  };
  
  // Check if form is dirty (values have changed)
  const isDirty = JSON.stringify(formValues) !== JSON.stringify(originalValues);
  
  // Validate form
  const validateForm = () => {
    try {
      profileSchema.parse(formValues);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: any = {};
        error.errors.forEach((err) => {
          if (err.path.length === 1) {
            newErrors[err.path[0]] = err.message;
          } else if (err.path.length === 2 && err.path[0] === 'company') {
            if (!newErrors.company) newErrors.company = {};
            newErrors.company[err.path[1]] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };
  
  // Check if form is valid
  const isValid = !Object.keys(errors).length && 
    formValues.firstName.trim() !== '' && 
    formValues.lastName.trim() !== '';
  
  // Notify parent of validation state changes
  useEffect(() => {
    onValidationChange?.(isValid);
  }, [isValid, onValidationChange]);
  
  // Handle field blur
  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
    
    // Validate the specific field
    try {
      if (field === 'firstName') {
        z.string().min(1, 'First name is required').parse(formValues.firstName);
        setErrors({ ...errors, firstName: undefined });
      } else if (field === 'lastName') {
        z.string().min(1, 'Last name is required').parse(formValues.lastName);
        setErrors({ ...errors, lastName: undefined });
      } else if (field === 'company.website' && formValues.company.website) {
        z.string().url('Please enter a valid URL').parse(formValues.company.website);
        setErrors({
          ...errors,
          company: {
            ...errors.company,
            website: undefined,
          },
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        if (field === 'firstName' || field === 'lastName') {
          setErrors({
            ...errors,
            [field]: error.errors[0].message,
          });
        } else if (field === 'company.website') {
          setErrors({
            ...errors,
            company: {
              ...errors.company,
              website: error.errors[0].message,
            },
          });
        }
      }
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Reset form error
    setErrors({ ...errors, form: undefined });
    
    // Mark required fields as touched
    setTouched({
      ...touched,
      firstName: true,
      lastName: true,
    });
    
    // Validate form
    const isFormValid = validateForm();
    if (!isFormValid) {
      return;
    }
    
    // Prepare profile data
    const profileData: ProfileUpdatePayload = {
      username: formValues.username || undefined,
      firstName: formValues.firstName,
      lastName: formValues.lastName,
    };
    
    // Add company data if needed
    if (showCompanyInfo && (
      formValues.company.name ||
      formValues.company.size ||
      formValues.company.industry ||
      formValues.company.website ||
      formValues.company.position ||
      formValues.company.department ||
      formValues.company.vatId ||
      formValues.company.address.street ||
      formValues.company.address.city ||
      formValues.company.address.state ||
      formValues.company.address.postalCode ||
      formValues.company.address.country
    )) {
      profileData.company = {
        name: formValues.company.name || undefined,
        size: formValues.company.size || undefined,
        industry: formValues.company.industry || undefined,
        website: formValues.company.website || undefined,
        position: formValues.company.position || undefined,
        department: formValues.company.department || undefined,
        vatId: formValues.company.vatId || undefined,
      };
      
      // Add address if any address field is filled
      if (
        formValues.company.address.street ||
        formValues.company.address.city ||
        formValues.company.address.state ||
        formValues.company.address.postalCode ||
        formValues.company.address.country
      ) {
        profileData.company.address = {
          street: formValues.company.address.street || undefined,
          city: formValues.company.address.city || undefined,
          state: formValues.company.address.state || undefined,
          postalCode: formValues.company.address.postalCode || undefined,
          country: formValues.company.address.country || undefined,
        };
      }
    }
    
    // Submit form
    setIsSubmitting(true);
    
    try {
      if (onSubmit) {
        // Use custom submit handler
        await onSubmit(profileData);
      } else if (user?.id) {
        // Use default profile hook
        const result = await updateProfile(user.id, profileData);
        
        if (result.success && result.profile) {
          // Update original values to match current values
          setOriginalValues(formValues);
        } else if (result.error) {
          setErrors({ ...errors, form: result.error });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      setErrors({ ...errors, form: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle profile picture upload
  const handleUploadProfilePicture = async (file: Blob) => {
    if (!user?.id) return;
    
    try {
      await uploadProfilePicture(user.id, file);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload profile picture';
      setErrors({ ...errors, form: errorMessage });
    }
  };
  
  // Handle profile picture deletion
  const handleDeleteProfilePicture = async () => {
    if (!user?.id) return;
    
    try {
      await deleteProfilePicture(user.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete profile picture';
      setErrors({ ...errors, form: errorMessage });
    }
  };
  
  // If there's a form error from the profile service, display it
  useEffect(() => {
    if (formError) {
      setErrors({ ...errors, form: formError });
    }
  }, [formError]);
  
  // Render the component using the render prop
  return render({
    handleSubmit,
    handleUploadProfilePicture,
    handleDeleteProfilePicture,
    profile: currentProfile,
    formValues,
    setFormValue,
    setCompanyValue,
    setAddressValue,
    isSubmitting: isLoading,
    isValid,
    errors: {
      ...errors,
      form: errors.form || formError
    },
    successMessage: formSuccessMessage,
    touched,
    handleBlur,
    isDirty,
    resetForm
  });
}
