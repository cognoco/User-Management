/**
 * Headless ProfileTypeConversion Component
 *
 * Handles converting a personal profile to a business profile
 * using render props for UI rendering.
 */

import { useState, FormEvent } from 'react';
import { z } from 'zod';
import { useAccountSettings } from '@/hooks/user/useAccountSettings';
import { useAuth } from '@/hooks/auth/useAuth';

/** Props for ProfileTypeConversion */
export interface ProfileTypeConversionProps {
  /** Called when conversion succeeds */
  onConverted?: () => void;
  /** Render prop for UI */
  render: (props: ProfileTypeConversionRenderProps) => React.ReactNode;
}

/** Render props for ProfileTypeConversion */
export interface ProfileTypeConversionRenderProps {
  formValues: ConversionFormValues;
  setFieldValue: (field: keyof ConversionFormValues, value: string) => void;
  isSubmitting: boolean;
  errors: Partial<Record<keyof ConversionFormValues, string>> & { form?: string };
  handleSubmit: (e: FormEvent) => void;
}

interface ConversionFormValues {
  companyName: string;
  companyDomain: string;
}

const conversionSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  companyDomain: z.string().min(1, 'Domain is required'),
});

export function ProfileTypeConversion({ onConverted, render }: ProfileTypeConversionProps) {
  const { convertAccountType, isLoading, error } = useAccountSettings();
  const { user } = useAuth();

  const [formValues, setFormValues] = useState<ConversionFormValues>({
    companyName: '',
    companyDomain: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const setFieldValue = (field: keyof ConversionFormValues, value: string) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    try {
      conversionSchema.parse(formValues);
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach(e => {
          const path = e.path.join('.') as keyof ConversionFormValues;
          newErrors[path] = e.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate() || !user?.id) return;
    setSubmitting(true);
    try {
      const result = await convertAccountType(user.id, 'business', {
        companyName: formValues.companyName,
        companyDomain: formValues.companyDomain,
      });
      if (result.success) onConverted?.();
      else if (result.error) setErrors(prev => ({ ...prev, form: result.error! }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Conversion failed';
      setErrors(prev => ({ ...prev, form: msg }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>{render({
      formValues,
      setFieldValue,
      isSubmitting: isLoading || submitting,
      errors: { ...errors, form: errors.form || error || undefined },
      handleSubmit,
    })}</>
  );
}
