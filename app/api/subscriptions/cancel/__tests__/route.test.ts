import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { getApiSubscriptionService } from '@/services/subscription/factory';
import { checkRateLimit } from '@/middleware/rate-limit';
import { logUserAction } from '@/lib/audit/auditLogger';

vi.mock('@/services/subscription/factory', () => ({
  getApiSubscriptionService: vi.fn(),
}));
vi.mock('@/middleware/rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue(false) }));
vi.mock('@/lib/audit/auditLogger', () => ({ logUserAction: vi.fn() }));

describe('subscriptions cancel API', () => {
  const service = {
    cancelSubscription: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.mocked(getApiSubscriptionService).mockReturnValue(service);
    vi.clearAllMocks();
  });

  it('cancels subscription', async () => {
    service.cancelSubscription.mockResolvedValue({ success: true });
    const req = new NextRequest('http://test', { method: 'POST', body: JSON.stringify({ subscriptionId: 'sub1' }) });
    req.headers.set('x-user-id', 'u1');
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(service.cancelSubscription).toHaveBeenCalledWith('sub1', undefined);
  });

  it('returns 400 for invalid payload', async () => {
    const req = new NextRequest('http://test', { method: 'POST', body: JSON.stringify({}) });
    req.headers.set('x-user-id', 'u1');
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('requires auth', async () => {
    const req = new NextRequest('http://test', { method: 'POST', body: JSON.stringify({ subscriptionId: 'sub1' }) });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });
});
