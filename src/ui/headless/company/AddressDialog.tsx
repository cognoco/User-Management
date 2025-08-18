'use client';

import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

export const addressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State/Province is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
  isPrimary: z.boolean().optional(),
});

export type AddressFormData = z.infer<typeof addressSchema>;

export interface AddressDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AddressFormData) => Promise<void>;
  initialData?: AddressFormData;
  render: (props: { form: ReturnType<typeof useForm<AddressFormData>>; isSubmitting: boolean; handleSubmit: () => Promise<void>; }) => React.ReactNode;
}

export function AddressDialog({ isOpen, onClose, onSave, initialData, render }: AddressDialogProps): React.ReactElement => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: initialData || { street: '', city: '', state: '', postalCode: '', country: '', isPrimary: false },
  });

  const handleSubmit = async (data: AddressFormData): Promise<void> => {
    setIsSubmitting(true);
    try {
      await onSave(data);
      form.reset();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return <>{isOpen && render({ form, isSubmitting, handleSubmit: form.handleSubmit(handleSubmit) })}</>;
}
