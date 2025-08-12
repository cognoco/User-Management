import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { getApiSubscriptionService } from '@/services/subscription/factory';
import { checkRateLimit } from '@/middleware/rate-limit';
import { createApiHandler } from '@/lib/api/route-helpers';
import { createSuccessResponse } from '@/lib/api/common/response-formatter';


vi.mock('@/middleware/rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue(false) }));
vi.mock('@/lib/api/route-helpers', () => ({
  createApiHandler: vi.fn((schema, handler, options) => {
    return async (req) => {
      const authContext = options?.requireAuth ? { userId: req.headers.get('x-user-id') } : {};
      
      if (options?.requireAuth && !authContext.userId) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
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
  getUserSubscription: vi.fn(),
};

describe('subscriptions status API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getApiSubscriptionService).mockReturnValue(mockSubscriptionService as any);
  });

  it('returns subscription', async () => {
    const mockSubscription = { id: 'sub1', status: 'active', plan: 'premium' };
    mockSubscriptionService.getUserSubscription.mockResolvedValue(mockSubscription);
    vi.mocked(createSuccessResponse).mockReturnValue(
      Response.json({ data: mockSubscription })
    );
    
    const req = new Request('http://test', { method: 'GET' });
    req.headers.set('x-user-id', 'u1');
    
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe('sub1');
    expect(mockSubscriptionService.getUserSubscription).toHaveBeenCalledWith('u1');
  });

  it('unauthorized without header', async () => {
    const req = new Request('http://test', { method: 'GET' });
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });
});
