import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import { getApiWebhookService } from '@/services/webhooks/factory';
import { getCurrentUser } from '@/lib/auth/session';
import { checkRateLimit } from '@/middleware/rate-limit';


vi.mock('@/lib/auth/session', () => ({ getCurrentUser: vi.fn().mockResolvedValue({ id: 'u1' }) }));
vi.mock('@/middleware/rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue(false) }));

function req(url: string) {
  return { method: 'GET', url, headers: { get: () => null } } as unknown as NextRequest;
}

describe('webhook deliveries route', () => {
  const service = {
    getWebhook: vi.fn(),
    getWebhookDeliveries: vi.fn(),
  } as any;

  beforeEach(() => {
    // Clear and register services in ServiceLocator
  const locator = ServiceLocator.getInstance();
  locator.clear();
  locator.register(ServiceKeys.ADDRESS_SERVICE, service);
    vi.clearAllMocks();
  });

  it('returns deliveries', async () => {
    service.getWebhook.mockResolvedValue({ id: 'w1' });
    service.getWebhookDeliveries.mockResolvedValue([{ id: 'd1' }]);
    const res = await GET(req('http://t/1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deliveries.length).toBe(1);
    expect(service.getWebhookDeliveries).toHaveBeenCalledWith('u1', '1', 10);
  });
});
