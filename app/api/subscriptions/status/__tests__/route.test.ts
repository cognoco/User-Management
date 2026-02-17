import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { getApiSubscriptionService } from '@/services/subscription/factory';
import { checkRateLimit } from '@/middleware/rate-limit';
import { logUserAction } from '@/lib/audit/auditLogger';

vi.mock('@/services/subscription/factory', () => ({
  getApiSubscriptionService: vi.fn(),
}));
vi.mock('@/middleware/rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue(false) }));
vi.mock('@/lib/audit/auditLogger', () => ({ logUserAction: vi.fn() }));

describe('subscriptions status API', () => {
  const service = {
    getUserSubscription: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.mocked(getApiSubscriptionService).mockReturnValue(service);
    vi.clearAllMocks();
  });

  it('returns subscription', async () => {
    service.getUserSubscription.mockResolvedValue({ id: 'sub1' });
    const req = new NextRequest('http://test');
    req.headers.set('x-user-id', 'u1');
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe('sub1');
  });

  it('unauthorized without header', async () => {
    const req = new NextRequest('http://test');
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });
});
