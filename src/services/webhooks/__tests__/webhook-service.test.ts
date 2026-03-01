import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebhookService } from '../WebhookService';
import type { IWebhookDataProvider } from '@/core/webhooks';

vi.mock('@/services/subscription/subscription-access', () => ({
  ensureSubscriptionTier: vi.fn()
}));

(global as any).fetch = vi.fn();

describe('WebhookService.triggerEvent', () => {
  let provider: IWebhookDataProvider & Record<string, any>;
  let service: WebhookService;

  beforeEach(() => {
    (global.fetch as any).mockReset();
    provider = {
      listWebhooks: vi.fn(),
      getWebhook: vi.fn(),
      createWebhook: vi.fn(),
      updateWebhook: vi.fn(),
      deleteWebhook: vi.fn(),
      listDeliveries: vi.fn(),
      recordDelivery: vi.fn(),
    } as unknown as IWebhookDataProvider & Record<string, any>;
    service = new WebhookService(provider);
  });

  it('sends events to user webhooks', async () => {
    (provider.listWebhooks as any).mockResolvedValueOnce([
      { id: 'w1', url: 'https://a.com', secret: 's', events: ['e'], isActive: true },
    ]);
    (provider.recordDelivery as any).mockResolvedValue(undefined);
    (global.fetch as any).mockResolvedValue({ ok: true, status: 200, text: async () => 'ok' });

    const deliveries = await service.triggerEvent('e', { id: 1 }, 'user-1');

    expect(provider.listWebhooks).toHaveBeenCalledWith('user-1');
    expect((global.fetch as any)).toHaveBeenCalledTimes(1);
    expect(provider.recordDelivery).toHaveBeenCalled();
    expect(deliveries[0].webhookId).toBe('w1');
  });

  it('returns empty array when userId is missing', async () => {
    const deliveries = await service.triggerEvent('e', {});
    expect(deliveries).toEqual([]);
    expect(provider.listWebhooks).not.toHaveBeenCalled();
  });
});
