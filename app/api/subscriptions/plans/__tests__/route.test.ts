import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { getApiSubscriptionService } from '@/services/subscription/factory';
import { checkRateLimit } from '@/middleware/rate-limit';
import { createApiHandler } from '@/lib/api/route-helpers';
import { createSuccessResponse } from '@/lib/api/common/response-formatter';

vi.mock('@/services/subscription/factory', () => ({
  getApiSubscriptionService: vi.fn(),
}));
vi.mock('@/middleware/rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue(false) }));
vi.mock('@/lib/api/route-helpers', () => ({
  createApiHandler: vi.fn((schema, handler, options) => {
    return async (req) => {
      const authContext = {};
      const services = { subscription: mockSubscriptionService };
      return await handler(req, authContext, {}, services);
    };
  }),
  emptySchema: {},
}));
vi.mock('@/lib/api/common/response-formatter', () => ({
  createSuccessResponse: vi.fn((data) => Response.json({ data })),
}));

const mockSubscriptionService = {
  getAvailablePlans: vi.fn(),
};

describe('subscriptions plans API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getApiSubscriptionService).mockReturnValue(mockSubscriptionService as any);
  });

  it('returns plans list', async () => {
    const mockPlans = [{ id: 'plan1', name: 'Basic', price: 10 }];
    mockSubscriptionService.getAvailablePlans.mockResolvedValue(mockPlans);
    vi.mocked(createSuccessResponse).mockReturnValue(
      Response.json({ data: { plans: mockPlans } })
    );
    
    const req = new Request('http://test', { method: 'GET' });
    const res = await GET(req as any);
    
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.plans).toEqual(mockPlans);
    expect(mockSubscriptionService.getAvailablePlans).toHaveBeenCalled();
  });
});
