/**
 * Pure Webhook Service Factory
 */

import type { IWebhookService } from '@/core/webhooks/interfaces';
import type { IWebhookDataProvider } from '@/core/webhooks/interfaces';
import { DefaultWebhookService } from './default-webhook.service';
import { AdapterRegistry } from '@/adapters/registry';

export interface WebhookServiceDependencies {
  adapterRegistry: AdapterRegistry;
  provider?: IWebhookDataProvider;
}

export function createWebhookService(deps: WebhookServiceDependencies): IWebhookService {
  const { adapterRegistry, provider } = deps;
  const webhookProvider = provider || adapterRegistry.getAdapter<IWebhookDataProvider>('webhook');
  return new DefaultWebhookService(webhookProvider);
}