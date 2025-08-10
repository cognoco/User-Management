import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { createCheckoutSession } from '@/lib/payments/stripe';
import { checkRateLimit } from '@/middleware/rate-limit';
import { logUserAction } from '@/lib/audit/auditLogger';
import { createSuccessResponse, createValidationError } from '@/lib/api/common/response-formatter';

vi.mock('@/lib/payments/stripe', () => ({
  createCheckoutSession: vi.fn(),
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

describe('subscriptions checkout API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up environment variables
    process.env.NEXT_PUBLIC_APP_URL = 'http://test.com';
  });

  it('creates checkout session', async () => {
    vi.mocked(createCheckoutSession).mockResolvedValue({ url: 'https://stripe.test' } as any);
    vi.mocked(createSuccessResponse).mockReturnValue(
      Response.json({ data: { url: 'https://stripe.test' } })
    );
    
    const req = new Request('http://test', { 
      method: 'POST', 
      body: JSON.stringify({ plan: 'price_123' }),
      headers: { 'Content-Type': 'application/json' }
    });
    
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.url).toBe('https://stripe.test');
    expect(createCheckoutSession).toHaveBeenCalledWith({
      mode: 'subscription',
      line_items: [{ price: 'price_123', quantity: 1 }],
      success_url: 'http://test.com/billing/success',
      cancel_url: 'http://test.com/billing/cancel',
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
