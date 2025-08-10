import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { createSupabaseSubscriptionProvider } from '@/adapters/subscription/factory';
import { createCustomer, createSubscription } from '@/lib/payments/stripe';

vi.mock('@/adapters/subscription/factory', () => ({
  createSupabaseSubscriptionProvider: vi.fn(),
}));
vi.mock('@/lib/payments/stripe', () => ({
  createCustomer: vi.fn(),
  createSubscription: vi.fn(),
  getSubscription: vi.fn(),
}));
vi.mock('@/middleware/auth', () => ({
  withRouteAuth: vi.fn((handler, req, options) => {
    // Mock auth context
    const mockAuth = {
      userId: 'user-123',
      user: { email: 'test@example.com' },
    };
    return handler(req, mockAuth);
  }),
}));

const mockRequest = (body: any) => {
  const req = new Request('http://localhost', { 
    method: 'POST', 
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' }
  });
  return req;
};

const mockGetRequest = () => {
  return new Request('http://localhost', { method: 'GET' });
};

describe('/api/subscription', () => {
  const mockProvider = {
    getUserSubscription: vi.fn(),
    upsertSubscription: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createSupabaseSubscriptionProvider).mockReturnValue(mockProvider as any);
  });

  it('GET returns subscription data', async () => {
    mockProvider.getUserSubscription.mockResolvedValue({
      id: '1',
      plan: 'pro',
      status: 'active',
    });
    
    const req = mockGetRequest();
    const res = await GET(req);
    const json = await res.json();
    
    expect(json.subscription).toBeDefined();
    expect(json.subscription.plan).toBe('pro');
  });

  it('GET returns null subscription when none exists', async () => {
    mockProvider.getUserSubscription.mockResolvedValue(null);
    
    const req = mockGetRequest();
    const res = await GET(req);
    const json = await res.json();
    
    expect(json.subscription).toBeNull();
  });

  it('POST creates subscription successfully', async () => {
    mockProvider.getUserSubscription.mockResolvedValue(null);
    vi.mocked(createCustomer).mockResolvedValue({ id: 'cus_123' } as any);
    vi.mocked(createSubscription).mockResolvedValue({
      id: 'sub_123',
      status: 'active',
      customer: 'cus_123',
    } as any);
    
    const req = mockRequest({ plan: 'price_pro' });
    const res = await POST(req);
    const json = await res.json();
    
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.subscription.id).toBe('sub_123');
  });

  it('POST returns 400 for invalid input', async () => {
    const req = mockRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
}); 