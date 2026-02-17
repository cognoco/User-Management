import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useWebhooks } from '@/hooks/webhooks/useWebhooks';
import type { Webhook, WebhookCreatePayload, WebhookUpdatePayload } from '@/core/webhooks/models';

export interface WebhookManagerRenderProps {
  webhooks: Webhook[];
  loading: boolean;
  error: string | null;
  create: (payload: WebhookCreatePayload) => Promise<void>;
  update: (id: string, payload: WebhookUpdatePayload) => Promise<void>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export interface WebhookManagerProps {
  userId: string;
  children: (props: WebhookManagerRenderProps) => ReactNode;
}

export function WebhookManager({ userId, children }: WebhookManagerProps) {
  const {
    webhooks,
    loading,
    error,
    fetchWebhooks,
    createWebhook,
    updateWebhook,
    deleteWebhook,
  } = useWebhooks(userId);

  useEffect(() => {
    void fetchWebhooks();
  }, [fetchWebhooks]);

  const create = async (payload: WebhookCreatePayload) => {
    await createWebhook.mutateAsync(payload);
    await fetchWebhooks();
  };

  const update = async (id: string, payload: WebhookUpdatePayload) => {
    await updateWebhook.mutateAsync({ id, ...payload });
    await fetchWebhooks();
  };

  const remove = async (id: string) => {
    await deleteWebhook.mutateAsync(id);
    await fetchWebhooks();
  };

  const refresh = async () => {
    await fetchWebhooks();
  };

  return children({ webhooks, loading, error, create, update, remove, refresh });
}

export default WebhookManager;
