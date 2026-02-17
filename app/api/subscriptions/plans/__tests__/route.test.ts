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

describe('subscriptions plans API', () => {
  const service = { getPlans: vi.fn() } as any;

  beforeEach(() => {
    vi.mocked(getApiSubscriptionService).mockReturnValue(service);
    vi.clearAllMocks();
  });

  it('returns plans list', async () => {
    service.getPlans.mockResolvedValue([{ id: 'plan1' }]);
    const req = new NextRequest('http://test');
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json[0].id).toBe('plan1');
    expect(service.getPlans).toHaveBeenCalled();
  });
});
