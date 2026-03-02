import React from 'react';
import { WebhookForm as HeadlessWebhookForm } from '@/ui/headless/webhooks/WebhookForm';
import { Input } from '@/ui/primitives/input';
import { Button } from '@/ui/primitives/button';
import { Checkbox } from '@/ui/primitives/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/primitives/card';
import type { WebhookCreatePayload } from '@/core/webhooks/models';
import type { WebhookFormRenderProps } from '@/ui/headless/webhooks/WebhookForm';

export interface WebhookFormProps {
  userId: string;
  availableEvents?: string[];
  onSubmit?: (payload: WebhookCreatePayload) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  children?: (props: {
    data: WebhookCreatePayload;
    setData: (data: WebhookCreatePayload) => void;
    submit: () => Promise<void>;
    loading: boolean;
    error: string | null;
  }) => React.ReactNode;
}

const defaultEvents = ['user.created', 'user.deleted'];

export function WebhookForm({ 
  userId,
  availableEvents = defaultEvents,
  onSubmit,
  loading: externalLoading = false,
  error: externalError = null,
  children
}: WebhookFormProps) {
  const renderDefault = ({ 
    data, 
    setData, 
    submit, 
    isSubmitting, 
    error: formError 
  }: WebhookFormRenderProps) => {
    const toggleEvent = (event: string) => {
      setData({
        ...data,
        events: data.events.includes(event)
          ? data.events.filter(e => e !== event)
          : [...data.events, event]
      });
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      void submit();
    };

    const isLoading = isSubmitting || externalLoading;
    const error = formError || externalError;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Create Webhook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input
                value={data.name}
                onChange={e => setData({ ...data, name: e.target.value })}
                placeholder="My Webhook"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">URL</label>
              <Input
                type="url"
                value={data.url}
                onChange={e => setData({ ...data, url: e.target.value })}
                placeholder="https://example.com/webhook"
                required
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Events</p>
              <div className="space-y-2">
                {availableEvents.map(event => (
                  <label key={event} className="flex items-center space-x-2 text-sm">
                    <Checkbox
                      checked={data.events.includes(event)}
                      onCheckedChange={() => toggleEvent(event)}
                    />
                    <span>{event}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Saving...' : 'Create Webhook'}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  };

  const adaptedChildren = children
    ? (props: WebhookFormRenderProps) => children({
        data: props.data,
        setData: props.setData,
        submit: props.submit,
        loading: props.isSubmitting,
        error: props.error,
      })
    : renderDefault;

  return (
    <HeadlessWebhookForm userId={userId} onSubmit={onSubmit}>
      {adaptedChildren}
    </HeadlessWebhookForm>
  );
}