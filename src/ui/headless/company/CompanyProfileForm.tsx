'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

export const companyProfileSchema = z.object({
  name: z.string().min(2).max(100),
  legal_name: z.string().min(2).max(100),
  registration_number: z.string().optional(),
  tax_id: z.string().optional(),
  website: z.string().url().optional(),
});

export type CompanyProfileFormData = z.infer<typeof companyProfileSchema>;

export interface CompanyProfileFormProps {
  initialData?: Partial<CompanyProfileFormData>;
  onSubmit: (data: CompanyProfileFormData) => Promise<void>;
  render: (props: { form: ReturnType<typeof useForm<CompanyProfileFormData>>; isSubmitting: boolean; handleSubmit: () => Promise<void>; }) => React.ReactNode;
}

export function CompanyProfileForm({ initialData, onSubmit, render }: CompanyProfileFormProps): React.ReactElement => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<CompanyProfileFormData>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      name: initialData?.name || '',
      legal_name: initialData?.legal_name || '',
      registration_number: initialData?.registration_number || '',
      tax_id: initialData?.tax_id || '',
      website: initialData?.website || '',
    },
  });

  const handleSubmit = async (data: CompanyProfileFormData): Promise<void> => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      form.reset(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return <>{render({ form, isSubmitting, handleSubmit: form.handleSubmit(handleSubmit) })}</>;
}
