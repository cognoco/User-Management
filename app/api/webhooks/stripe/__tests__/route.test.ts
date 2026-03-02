import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

vi.mock('@/lib/payments/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn()
    }
  }
}));

vi.mock('@/services/subscription/factory', () => ({
  getApiSubscriptionService: vi.fn(),
}));
vi.mock('@/middleware/rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue(false) }));
vi.mock('@/lib/audit/auditLogger', () => ({ logUserAction: vi.fn() }));

import { stripe } from '@/lib/payments/stripe';
import { getApiSubscriptionService } from '@/services/subscription/factory';

function createRequest(body: string, signature = 'sig') {
  return new NextRequest('http://localhost', {
    method: 'POST',
    headers: { 'stripe-signature': signature },
    body,
  });
}

describe('/api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test');
  });

  it('returns 400 for invalid signature', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => { throw new Error('bad'); });
    const res = await POST(createRequest('{}'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.message).toBe('Invalid signature');
  });

  it('returns 500 when STRIPE_WEBHOOK_SECRET is not set', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
    const res = await POST(createRequest('{}'));
    expect(res.status).toBe(500);
  });

  it('handles subscription events', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_123',
          status: 'active',
          metadata: { user_id: 'u1' },
          items: { data: [{ price: { id: 'price_abc' } }] },
          start_date: 1700000000,
          current_period_end: 1703000000,
        }
      }
    } as any);
    const service = { reconcileSubscription: vi.fn().mockResolvedValue(undefined) } as any;
    vi.mocked(getApiSubscriptionService).mockReturnValue(service);
    const res = await POST(createRequest('{"type":"customer.subscription.updated"}'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ received: true });
    expect(getApiSubscriptionService).toHaveBeenCalled();
    expect(service.reconcileSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sub_123',
        userId: 'u1',
        planId: 'price_abc',
      })
    );
  });

  it('returns 200 for unhandled event types', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: {} }
    } as any);
    const res = await POST(createRequest('{}'));
    expect(res.status).toBe(200);
  });
});
