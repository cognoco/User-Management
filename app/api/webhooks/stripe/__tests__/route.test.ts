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
import { checkRateLimit } from '@/middleware/rate-limit';
import { logUserAction } from '@/lib/audit/auditLogger';

function createRequest(body: any, signature = 'sig') {
  return new NextRequest('http://localhost', {
    method: 'POST',
    headers: { 'stripe-signature': signature },
    body: JSON.stringify(body)
  });
}

describe('/api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for invalid signature', async () => {
    stripe.webhooks.constructEvent.mockImplementation(() => { throw new Error('bad'); });
    const res = await POST(createRequest({}));
    expect(res.status).toBe(400);
  });

  it('handles subscription events', async () => {
    stripe.webhooks.constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub', metadata: { user_id: 'u1' }, items: { data: [{ price: { id: 'price' } }] }, start_date: 0, current_period_end: 0 } }
    });
    const service = { reconcileSubscription: vi.fn() } as any;
    vi.mocked(getApiSubscriptionService).mockReturnValue(service);
    const res = await POST(createRequest({}));
    expect(res.status).toBe(200);
    expect(getApiSubscriptionService).toHaveBeenCalled();
    expect(service.reconcileSubscription).toHaveBeenCalled();
  });
});
