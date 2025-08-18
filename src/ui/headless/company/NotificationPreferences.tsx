'use client';

import React, { useEffect, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { CompanyNotificationPreference, NotificationType, NotificationChannel } from '@/types/company';
import { api } from '@/lib/api/axios';

const emailSchema = z.object({
  email: z.string().min(1).email(),
});

type EmailFormValues = z.infer<typeof emailSchema>;

export interface NotificationPreferencesProps {
  companyId: string;
  render: (props: {
    preferences: CompanyNotificationPreference[];
    additionalEmails: { id: string; email: string }[];
    activeTab: string;
    setActiveTab: (tab: string) => void;
    isLoading: boolean;
    isSaving: boolean;
    error: string | null;
    emailForm: ReturnType<typeof useForm<EmailFormValues>>;
    handleToggleNotification: (id: string | undefined, type: NotificationType, enabled: boolean) => void;
    handleChannelChange: (id: string | undefined, type: NotificationType, channel: NotificationChannel) => void;
    handleAddEmail: () => Promise<void>;
    handleRemoveEmail: (id: string) => Promise<void>;
  }) => React.ReactNode;
}

export function NotificationPreferences({ companyId, render }: NotificationPreferencesProps): React.ReactElement => {
  const [preferences, setPreferences] = useState<CompanyNotificationPreference[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('domain-notifications');
  const [additionalEmails, setAdditionalEmails] = useState<{ id: string; email: string }[]>([]);
  const emailForm = useForm<EmailFormValues>({ resolver: zodResolver(emailSchema), defaultValues: { email: '' } });

  useEffect(() => { fetchPrefs(); }, [companyId]);

  const fetchPrefs = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await api.get(`/api/company/notifications/preferences`);
      setPreferences(response.data.preferences || []);
      const emails = response.data.preferences
        .flatMap((p: CompanyNotificationPreference) => p.recipients || [])
        .filter((r: any) => r.email && !r.is_admin)
        .map((r: any) => ({ id: r.id, email: r.email }));
      setAdditionalEmails(emails);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreference = async (
    id: string | undefined,
    type: NotificationType,
    updates: Partial<CompanyNotificationPreference>
  ): Promise<void> => {
    setIsSaving(true);
    try {
      if (id) {
        await api.patch(`/api/company/notifications/preferences/${id}`, updates);
      } else {
        await api.post(`/api/company/notifications/preferences`, {
          company_id: companyId,
          notification_type: type,
          ...updates,
        });
      }
      fetchPrefs();
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleNotification = (id: string | undefined, type: NotificationType, enabled: boolean): void => {
    updatePreference(id, type, { enabled });
  };

  const handleChannelChange = (id: string | undefined, type: NotificationType, channel: NotificationChannel): void => {
    updatePreference(id, type, { channel });
  };

  const handleAddEmail = async (): Promise<void> => {
    const values = emailForm.getValues();
    setIsSaving(true);
    try {
      await api.post('/api/company/notifications/recipients', { company_id: companyId, email: values.email, is_admin: false });
      emailForm.reset();
      fetchPrefs();
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveEmail = async (id: string): Promise<void> => {
    setIsSaving(true);
    try {
      await api.delete(`/api/company/notifications/recipients/${id}`);
      fetchPrefs();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>{render({ preferences, additionalEmails, activeTab, setActiveTab, isLoading, isSaving, error, emailForm, handleToggleNotification, handleChannelChange, handleAddEmail, handleRemoveEmail })}</>
  );
}
