import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mocked } from 'vitest';
import { createWebhookSender, verifySignature, DeliveryErrorType } from '../webhook-sender';
import type { IWebhookDataProvider } from '@/core/webhooks';
import crypto from 'crypto';

// Mock fetch
(global.fetch as any) = vi.fn();

vi.mock('crypto', () => {
  const createHmacMock = vi.fn().mockReturnValue({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue('mocked-signature')
  });
  return {
    default: {
      createHmac: createHmacMock,
      randomBytes: vi.fn(() => Buffer.from('1234567890abcdef')),
      randomUUID: vi.fn(() => 'uuid'),
      timingSafeEqual: vi.fn(() => false)
    },
    createHmac: createHmacMock,
    randomBytes: vi.fn(() => Buffer.from('1234567890abcdef')),
    randomUUID: vi.fn(() => 'uuid'),
    timingSafeEqual: vi.fn(() => false)
  };
});

/** Create a minimal valid Webhook test object */
function mkWebhook(overrides: {
  id: string; url: string; secret: string; events: string[]; isActive: boolean;
}) {
  return {
    userId: 'user',
    name: 'test-webhook',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('webhook sender', () => {
  let provider: Mocked<IWebhookDataProvider>;
  let sendWebhookEvent: ReturnType<typeof createWebhookSender>['sendWebhookEvent'];
  let getWebhookDeliveries: ReturnType<typeof createWebhookSender>['getWebhookDeliveries'];

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
      searchWebhooks: vi.fn(),
    } as unknown as Mocked<IWebhookDataProvider>;

    ({ sendWebhookEvent, getWebhookDeliveries } = createWebhookSender(provider));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches webhooks for the user', async () => {
    provider.listWebhooks.mockResolvedValueOnce([]);
    await sendWebhookEvent('user.created', {}, 'user-1');
    expect(provider.listWebhooks).toHaveBeenCalledWith('user-1');
  });

  it('sends events to matching webhooks', async () => {
    provider.listWebhooks.mockResolvedValueOnce([
      mkWebhook({ id: 'w1', url: 'https://a.com', secret: 's', events: ['user.created'], isActive: true }),
      mkWebhook({ id: 'w2', url: 'https://b.com', secret: 's2', events: ['other'], isActive: true })
    ]);
    provider.recordDelivery.mockResolvedValue(undefined);
    (global.fetch as any).mockResolvedValue({ ok: true, status: 200, text: async () => 'ok' });

    const results = await sendWebhookEvent('user.created', { id: 1 }, 'user');

    expect((global.fetch as any)).toHaveBeenCalledTimes(1);
    expect(results[0].webhookId).toBe('w1');
  });

  it('records failures', async () => {
    provider.listWebhooks.mockResolvedValueOnce([
      mkWebhook({ id: 'w1', url: 'https://a.com', secret: 's', events: ['user.created'], isActive: true })
    ]);
    provider.recordDelivery.mockResolvedValue(undefined);
    (global.fetch as any).mockRejectedValue(new Error('fail'));

    const results = await sendWebhookEvent('user.created', {}, 'user');

    expect(results[0].success).toBe(false);
    expect(provider.recordDelivery).toHaveBeenCalled();
  });

  it('signs payload with secret', async () => {
    provider.listWebhooks.mockResolvedValueOnce([
      mkWebhook({ id: 'w1', url: 'https://a.com', secret: 'secret', events: ['e'], isActive: true })
    ]);
    provider.recordDelivery.mockResolvedValue(undefined);
    (global.fetch as any).mockResolvedValue({ ok: true, status: 200, text: async () => '' });

    await sendWebhookEvent('e', {}, 'user');

    expect(crypto.createHmac).toHaveBeenCalledWith('sha256', 'secret');
  });

  it('gets deliveries via provider', async () => {
    provider.listDeliveries.mockResolvedValueOnce({ deliveries: [{ id: 'd', webhookId: 'w', eventType: 'e', createdAt: '' } as any], pagination: undefined });
    const res = await getWebhookDeliveries('user', 'w');
    expect(provider.listDeliveries).toHaveBeenCalledWith('user', 'w', 10);
    expect(res.length).toBe(1);
  });

  it('returns empty array when no active webhooks match event', async () => {
    provider.listWebhooks.mockResolvedValueOnce([
      mkWebhook({ id: 'w1', url: 'https://a.com', secret: 's', events: ['other'], isActive: true }),
      mkWebhook({ id: 'w2', url: 'https://b.com', secret: 's', events: ['user.created'], isActive: false })
    ]);

    const results = await sendWebhookEvent('user.created', {}, 'user');
    expect(results).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('marks delivery unsuccessful when status code not ok', async () => {
    provider.listWebhooks.mockResolvedValueOnce([
      mkWebhook({ id: 'w1', url: 'https://a.com', secret: 's', events: ['user.created'], isActive: true })
    ]);
    provider.recordDelivery.mockResolvedValue(undefined);
    (global.fetch as any).mockResolvedValue({ ok: false, status: 500, text: async () => 'err' });

    const results = await sendWebhookEvent('user.created', {}, 'user');
    expect(results[0].success).toBe(false);
    expect(results[0].statusCode).toBe(500);
    expect(provider.recordDelivery).toHaveBeenCalled();
  });

  it('retries on server error', async () => {
    provider.listWebhooks.mockResolvedValueOnce([
      mkWebhook({ id: 'w1', url: 'https://a.com', secret: 's', events: ['e'], isActive: true })
    ]);
    provider.recordDelivery.mockResolvedValue(undefined);
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'err' })
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => 'ok' });

    const results = await sendWebhookEvent('e', {}, 'user');
    expect((global.fetch as any)).toHaveBeenCalledTimes(2);
    expect(results[0].success).toBe(true);
  });

  it('returns invalid payload error', async () => {
    provider.listWebhooks.mockResolvedValueOnce([
      mkWebhook({ id: 'w1', url: 'https://a.com', secret: 's', events: [''], isActive: true })
    ]);

    const results = await sendWebhookEvent('', {}, 'user');
    expect(results[0].success).toBe(false);
    expect(results[0].errorType).toBe(DeliveryErrorType.INVALID_PAYLOAD);
  });

  it('verifySignature throws on mismatch', () => {
    const payload = JSON.stringify({ event: 'e', data: {} });
    expect(() => verifySignature(payload, 's', 'bad')).toThrow('Invalid signature');
  });
});
