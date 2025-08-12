import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { getApiSubscriptionService } from '@/services/subscription/factory';
import { checkRateLimit } from '@/middleware/rate-limit';
import { logUserAction } from '@/lib/audit/auditLogger';
import { createApiHandler } from '@/lib/api/route-helpers';
import { createSuccessResponse } from '@/lib/api/common/response-formatter';


vi.mock('@/middleware/rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue(false) }));
vi.mock('@/lib/audit/auditLogger', () => ({ logUserAction: vi.fn() }));
vi.mock('@/lib/api/route-helpers', () => ({
  createApiHandler: vi.fn((schema, handler, options) => {
    return async (req) => {
      try {
        const body = await req.json();
        const authContext = options?.requireAuth ? { userId: req.headers.get('x-user-id') } : {};
        
        if (options?.requireAuth && !authContext.userId) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        // Validate schema
        if (!body.subscriptionId) {
          return Response.json({ error: 'Missing subscriptionId' }, { status: 400 });
        }
        
        const services = { subscription: mockSubscriptionService };
        return await handler(req, authContext, body, services);
      } catch (error) {
        return Response.json({ error: 'Invalid JSON' }, { status: 400 });
      }
    };
  }),
}));
vi.mock('@/lib/api/common/response-formatter', () => ({
  createSuccessResponse: vi.fn((data) => Response.json({ data })),
}));

const mockSubscriptionService = {
  cancelSubscription: vi.fn(),
};

describe('subscriptions cancel API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getApiSubscriptionService).mockReturnValue(mockSubscriptionService as any);
  });

  it('cancels subscription', async () => {
    mockSubscriptionService.cancelSubscription.mockResolvedValue({ success: true });
    vi.mocked(createSuccessResponse).mockReturnValue(
      Response.json({ data: { success: true } })
    );
    
    const req = new Request('http://test', { 
      method: 'POST', 
      body: JSON.stringify({ subscriptionId: 'sub1' }),
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': 'u1'
      }
    });
    
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(mockSubscriptionService.cancelSubscription).toHaveBeenCalledWith('sub1', undefined);
  });

  it('returns 400 for invalid payload', async () => {
    const req = new Request('http://test', { 
      method: 'POST', 
      body: JSON.stringify({}),
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': 'u1'
      }
    });
    
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('requires auth', async () => {
    const req = new Request('http://test', { 
      method: 'POST', 
      body: JSON.stringify({ subscriptionId: 'sub1' }),
      headers: { 
        'Content-Type': 'application/json'
      }
    });
    
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });
});
