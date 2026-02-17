/**
 * Headless Profile Form Component
 *
 * Provides profile editing logic without UI. Uses render props to
 * supply state and handlers to the consuming component.
 */

import { useState, useEffect, FormEvent } from 'react';
import { z } from 'zod';
import { useUserProfile } from '@/hooks/user/useUserProfile';
import type { UserProfile, ProfileUpdatePayload } from '@/core/user/models';

/** Props for the ProfileForm component */
export interface ProfileFormProps {
  /** Optional initial profile values */
  initialProfile?: Partial<UserProfile>;
  /** Profile type determines which fields are shown */
  profileType?: 'personal' | 'business';
  /** Custom submission handler */
  onSubmit?: (payload: ProfileUpdatePayload) => Promise<void>;
  /** Called when the user cancels editing */
  onCancel?: () => void;
  /** External loading state */
  isLoading?: boolean;
  /** External error message */
  error?: string;
  /** Render prop returning the UI */
  render: (props: ProfileFormRenderProps) => React.ReactNode;
}

/** Render prop object for ProfileForm */
export interface ProfileFormRenderProps {
  /** Current form values */
  formValues: ProfileUpdateFormValues;
  /** Set a field value */
  setFieldValue: (field: keyof ProfileUpdateFormValues, value: string) => void;
  /** Set a company field value */
  setCompanyFieldValue: (field: keyof CompanyFormValues, value: string) => void;
  /** Handle form submission */
  handleSubmit: (e: FormEvent) => void;
  /** Cancel editing */
  handleCancel: () => void;
  /** Form validation errors */
  errors: Partial<Record<keyof ProfileUpdateFormValues | keyof CompanyFormValues, string>> & { form?: string };
  /** Whether submission is in progress */
  isSubmitting: boolean;
  /** Whether form is valid */
  isValid: boolean;
}

interface CompanyFormValues {
  name: string;
  website: string;
  contactEmail: string;
}

interface ProfileUpdateFormValues {
  firstName: string;
  lastName: string;
  phone: string;
  company: CompanyFormValues;
}

const personalSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
});

const businessSchema = personalSchema.extend({
  company: z.object({
    name: z.string().min(1, 'Company name is required'),
    website: z.string().url('Invalid website').optional(),
    contactEmail: z.string().email('Invalid email'),
  }),
});

export function ProfileForm({
  initialProfile,
  profileType = 'personal',
  onSubmit,
  onCancel,
  isLoading: externalLoading,
  error: externalError,
  render,
}: ProfileFormProps) {
  const {
    profile,
    updateProfile,
    isLoading: profileLoading,
    error: profileError,
  } = useUserProfile();

  const [formValues, setFormValues] = useState<ProfileUpdateFormValues>({
    firstName: '',
    lastName: '',
    phone: '',
    company: { name: '', website: '', contactEmail: '' },
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // merge profile data when available
  useEffect(() => {
    const p = initialProfile || profile;
    if (p) {
      setFormValues({
        firstName: p.firstName || '',
        lastName: p.lastName || '',
        phone: (p as any).phone || '',
        company: {
          name: p.company?.name || '',
          website: p.company?.website || '',
          contactEmail: p.company?.address?.street || '',
        },
      });
    }
  }, [initialProfile, profile]);

  const setFieldValue = (field: keyof ProfileUpdateFormValues, value: string) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
  };

  const setCompanyFieldValue = (field: keyof CompanyFormValues, value: string) => {
    setFormValues(prev => ({
      ...prev,
      company: { ...prev.company, [field]: value },
    }));
  };

  const validate = () => {
    try {
      if (profileType === 'business') {
        businessSchema.parse(formValues);
      } else {
        personalSchema.parse(formValues);
      }
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach(e => {
          const path = e.path.join('.');
          newErrors[path] = e.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    const payload: ProfileUpdatePayload = {
      firstName: formValues.firstName,
      lastName: formValues.lastName,
      ...(formValues.phone ? { metadata: { phone: formValues.phone } } : {}),
    };
    if (profileType === 'business') {
      payload.company = {
        name: formValues.company.name,
        website: formValues.company.website || undefined,
      };
    }
    try {
      if (onSubmit) await onSubmit(payload);
      else if (profile?.id) await updateProfile(profile.id, payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Profile update failed';
      setErrors(prev => ({ ...prev, form: message }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
  };

  const isValid = Object.keys(errors).length === 0 &&
    formValues.firstName.trim() !== '' &&
    formValues.lastName.trim() !== '' &&
    (profileType === 'personal' || formValues.company.name.trim() !== '');

  const loading = (externalLoading ?? profileLoading) || isSubmitting;
  const formError = externalError ?? profileError ?? undefined;

  return (
    <>{render({
      formValues,
      setFieldValue,
      setCompanyFieldValue,
      handleSubmit,
      handleCancel,
      errors: { ...errors, form: errors.form || formError || undefined },
      isSubmitting: loading,
      isValid,
    })}</>
  );
}
