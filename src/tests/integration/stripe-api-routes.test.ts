import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock stripe before imports
vi.mock('@/lib/payments/stripe-enhanced', () => ({
  getStripe: vi.fn(() => ({
    customers: {
      create: vi.fn(),
      list: vi.fn(),
    },
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
  })),
  createOrUpdateCustomer: vi.fn(),
  createCheckoutSession: vi.fn(),
  verifyWebhookSignature: vi.fn(),
  handleWebhookEvent: vi.fn(),
}));

// Mock subscription service
vi.mock('@/services/subscription/subscription.factory', () => ({
  getSubscriptionService: vi.fn(() => ({
    getSubscription: vi.fn(),
    createSubscription: vi.fn(),
    updateSubscription: vi.fn(),
    recordPayment: vi.fn(),
  })),
}));

// Mock auth
vi.mock('@/middleware/auth', () => ({
  withRouteAuth: vi.fn((handler) => handler),
}));

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() => Promise.resolve({
    user: { id: 'user_123', email: 'test@example.com' }
  })),
}));

// Mock next-auth/next
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(() => Promise.resolve({
    user: { id: 'user_123', email: 'test@example.com' }
  })),
}));

// Mock auth options
vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}));

describe('Stripe API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_mock';
  });

  describe('Checkout Route', () => {
    it('should create checkout session', async () => {
      const { POST } = await import('../../../app/api/payments/checkout/route');
      const { createCheckoutSession } = await import('@/lib/payments/stripe-enhanced');
      
      vi.mocked(createCheckoutSession).mockResolvedValue({
        id: 'cs_test',
        url: 'https://checkout.stripe.com/pay/cs_test',
      } as any);

      const request = new Request('http://localhost/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: 'price_test',
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
        }),
      });

      const response = await POST(request, { userId: 'user_123', user: { email: 'test@example.com' } } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessionId).toBe('cs_test');
      expect(data.url).toBe('https://checkout.stripe.com/pay/cs_test');
    });
  });

  describe('Invoice Route', () => {
    it('should list invoices', async () => {
      const { GET } = await import('../../../app/api/payments/invoices/route');
      const { getStripe } = await import('@/lib/payments/stripe-enhanced');
      
      const mockStripe = {
        invoices: {
          list: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'inv_test',
                amount_due: 1999,
                currency: 'usd',
                status: 'paid',
              },
            ],
            has_more: false,
          }),
        },
        customers: {
          list: vi.fn().mockResolvedValue({
            data: [{ id: 'cus_test' }],
          }),
        },
      };
      
      vi.mocked(getStripe).mockReturnValue(mockStripe as any);

      const request = new Request('http://localhost/api/payments/invoices');
      const response = await GET(request, { userId: 'user_123', user: { email: 'test@example.com' } } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invoices).toHaveLength(1);
      expect(data.invoices[0].id).toBe('inv_test');
    });
  });
});