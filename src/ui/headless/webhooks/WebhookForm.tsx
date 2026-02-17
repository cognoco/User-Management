import React, { useState, FormEvent } from 'react';
import { useWebhooks } from '@/hooks/webhooks/useWebhooks';
import type { WebhookCreatePayload } from '@/core/webhooks/models';

export interface WebhookFormRenderProps {
  name: string;
  setName: (v: string) => void;
  url: string;
  setUrl: (v: string) => void;
  events: string[];
  toggleEvent: (e: string) => void;
  handleSubmit: (e: FormEvent) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
  data: WebhookCreatePayload;
  setData: (data: WebhookCreatePayload) => void;
  submit: () => Promise<void>;
}

export interface WebhookFormProps {
  userId: string;
  onSubmit?: (payload: WebhookCreatePayload) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  children: (props: WebhookFormRenderProps) => React.ReactNode;
}

export function WebhookForm({
  userId,
  onSubmit,
  children,
  loading: externalLoading = false,
  error: externalError = null
}: WebhookFormProps) {
  const { createWebhook } = useWebhooks(userId);
  const [data, setData] = useState<WebhookCreatePayload>({ 
    name: '', 
    url: '', 
    events: [],
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  const toggleEvent = (event: string) => {
    setData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await submit();
  };

  const submit = async () => {
    setIsSubmitting(true);
    setInternalError(null);
    
    try {
      if (onSubmit) {
        await onSubmit(data);
      } else {
        await createWebhook.mutateAsync(data);
      }
      // Reset form only on successful submission
      setData({ name: '', url: '', events: [], isActive: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit webhook';
      setInternalError(message);
      throw err; // Re-throw to allow error handling in parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const error = internalError || externalError;

  return children({
    name: data.name,
    setName: (name) => setData(prev => ({ ...prev, name })),
    url: data.url,
    setUrl: (url) => setData(prev => ({ ...prev, url })),
    events: data.events,
    toggleEvent,
    handleSubmit,
    isSubmitting: externalLoading || isSubmitting,
    error,
    data,
    setData,
    submit
  });
}