import type { IWebhookService } from '@/core/webhooks/IWebhookService';
import type { IWebhookDataProvider } from '@/core/webhooks/IWebhookDataProvider';
import type {
  Webhook,
  WebhookCreatePayload,
  WebhookUpdatePayload,
  WebhookDelivery,
} from '@/core/webhooks/models';
import { createWebhookSender } from '@/lib/webhooks/webhook-sender';
import { SubscriptionTier } from '@/core/subscription/models';
import { ensureSubscriptionTier } from '@/services/subscription/subscription-access';

export class WebhookService implements IWebhookService {
  private sender;

  constructor(private dataProvider: IWebhookDataProvider) {
    this.sender = createWebhookSender(this.dataProvider);
  }

  async getWebhooks(userId: string): Promise<Webhook[]> {
    await ensureSubscriptionTier(userId, SubscriptionTier.PREMIUM);
    return this.dataProvider.listWebhooks(userId);
  }

  async getWebhook(userId: string, webhookId: string): Promise<Webhook | null> {
    await ensureSubscriptionTier(userId, SubscriptionTier.PREMIUM);
    return this.dataProvider.getWebhook(userId, webhookId);
  }

  async createWebhook(
    userId: string,
    payload: WebhookCreatePayload
  ): Promise<{ success: boolean; webhook?: Webhook; error?: string }> {
    await ensureSubscriptionTier(userId, SubscriptionTier.PREMIUM);
    return this.dataProvider.createWebhook(userId, payload);
  }

  async updateWebhook(
    userId: string,
    webhookId: string,
    payload: WebhookUpdatePayload
  ): Promise<{ success: boolean; webhook?: Webhook; error?: string }> {
    await ensureSubscriptionTier(userId, SubscriptionTier.PREMIUM);
    return this.dataProvider.updateWebhook(userId, webhookId, payload);
  }

  async deleteWebhook(
    userId: string,
    webhookId: string
  ): Promise<{ success: boolean; error?: string }> {
    await ensureSubscriptionTier(userId, SubscriptionTier.PREMIUM);
    return this.dataProvider.deleteWebhook(userId, webhookId);
  }

  async getWebhookDeliveries(
    userId: string,
    webhookId: string,
    limit?: number
  ): Promise<WebhookDelivery[]> {
    await ensureSubscriptionTier(userId, SubscriptionTier.PREMIUM);
    return this.dataProvider.listDeliveries(userId, webhookId, limit);
  }

  async triggerEvent(
    eventType: string,
    payload: unknown,
    userId?: string
  ): Promise<WebhookDelivery[]> {
    if (!userId) {
      return [];
    }

    await ensureSubscriptionTier(userId, SubscriptionTier.PREMIUM);

    const results = await this.sender.sendWebhookEvent(eventType, payload, userId);
    // Strip success field before returning
    return results.map(({ success, ...delivery }) => {
      // Intentionally omitting success field from response
      void success;
      return delivery;
    });
  }
}
