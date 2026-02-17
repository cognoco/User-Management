import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { createBillingPortalSession } from '@/lib/payments/stripe';
import { checkRateLimit } from '@/middleware/rate-limit';
import { logUserAction } from '@/lib/audit/auditLogger';

vi.mock('@/lib/payments/stripe', () => ({
  createBillingPortalSession: vi.fn(),
}));
vi.mock('@/middleware/rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue(false) }));
vi.mock('@/lib/audit/auditLogger', () => ({ logUserAction: vi.fn() }));

describe('subscriptions portal API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates portal session', async () => {
    vi.mocked(createBillingPortalSession).mockResolvedValue({ url: 'https://portal.test' } as any);
    const req = new NextRequest('http://test', { method: 'POST', body: JSON.stringify({ customerId: 'cus_123' }) });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe('https://portal.test');
    expect(createBillingPortalSession).toHaveBeenCalled();
  });

  it('returns 400 on invalid payload', async () => {
    const req = new NextRequest('http://test', { method: 'POST', body: JSON.stringify({}) });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});
