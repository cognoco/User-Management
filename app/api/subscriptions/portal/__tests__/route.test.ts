import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { createBillingPortalSession } from '@/lib/payments/stripe';
import { checkRateLimit } from '@/middleware/rate-limit';
import { logUserAction } from '@/lib/audit/auditLogger';
import { createSuccessResponse } from '@/lib/api/common/response-formatter';

vi.mock('@/lib/payments/stripe', () => ({
  createBillingPortalSession: vi.fn(),
}));
vi.mock('@/middleware/rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue(false) }));
vi.mock('@/lib/audit/auditLogger', () => ({ logUserAction: vi.fn() }));
vi.mock('@/lib/api/common/response-formatter', () => ({
  createSuccessResponse: vi.fn((data) => Response.json({ data })),
  createValidationError: vi.fn((message) => { 
    const error = new Error(message);
    throw error;
  }),
}));

describe('subscriptions portal API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'http://test.com';
  });

  it('creates portal session', async () => {
    vi.mocked(createBillingPortalSession).mockResolvedValue({ url: 'https://portal.test' } as any);
    vi.mocked(createSuccessResponse).mockReturnValue(
      Response.json({ data: { url: 'https://portal.test' } })
    );
    
    const req = new Request('http://test', { 
      method: 'POST', 
      body: JSON.stringify({ customerId: 'cus_123' }),
      headers: { 'Content-Type': 'application/json' }
    });
    
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.url).toBe('https://portal.test');
    expect(createBillingPortalSession).toHaveBeenCalledWith({
      customer: 'cus_123',
      return_url: 'http://test.com/billing',
    });
  });

  it('returns 400 on invalid payload', async () => {
    const req = new Request('http://test', { 
      method: 'POST', 
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' }
    });
    
    await expect(POST(req as any)).rejects.toThrow();
  });
});
