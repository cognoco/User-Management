import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import type Stripe from 'stripe';

// Mock dependencies
vi.mock('@/lib/payments/stripe-enhanced');
vi.mock('@/services/subscription/subscription.factory');
vi.mock('@/services/user/user.factory');
vi.mock('next/headers', () => ({
  headers: vi.fn().mockReturnValue({
    get: vi.fn((key: string) => {
      if (key === 'stripe-signature') {
        return 'test_signature';
      }
      return null;
    }),
  }),
}));

// Import mocked modules
import { verifyWebhookSignature, handleWebhookEvent } from '@/lib/payments/stripe-enhanced';
import { getSubscriptionService } from '@/services/subscription/subscription.factory';
import { getUserService } from '@/services/user/user.factory';

describe('POST /api/webhooks/stripe', () => {
  let mockSubscriptionService: any;
  let mockUserService: any;
  let mockVerifyWebhookSignature: any;
  let mockHandleWebhookEvent: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock services
    mockSubscriptionService = {
      updateSubscription: vi.fn().mockResolvedValue({}),
      recordPayment: vi.fn().mockResolvedValue({}),
      getSubscription: vi.fn().mockResolvedValue(null),
      createSubscription: vi.fn().mockResolvedValue({}),
    };
    
    mockUserService = {
      updateUser: vi.fn().mockResolvedValue({}),
      getUser: vi.fn().mockResolvedValue(null),
    };
    
    // Setup mocks
    vi.mocked(getSubscriptionService).mockReturnValue(mockSubscriptionService);
    vi.mocked(getUserService).mockReturnValue(mockUserService);
    
    mockVerifyWebhookSignature = vi.mocked(verifyWebhookSignature);
    mockHandleWebhookEvent = vi.mocked(handleWebhookEvent).mockResolvedValue();
    
    // Setup environment
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
  });

  afterEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it('should return 400 if no signature is provided', async () => {
    const { headers } = await import('next/headers');
    vi.mocked(headers).mockReturnValueOnce({
      get: vi.fn(() => null),
    } as any);

    const request = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('No signature provided');
  });

  it('should return 500 if webhook secret is not configured', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const request = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Webhook secret not configured');
  });

  it('should handle customer.subscription.created event', async () => {
    const mockEvent: Stripe.Event = {
      id: 'evt_test',
      object: 'event',
      api_version: '2023-10-16',
      created: 1234567890,
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_test',
          object: 'subscription',
          customer: 'cus_test',
          status: 'active',
          current_period_start: 1234567890,
          current_period_end: 1234567890,
          cancel_at_period_end: false,
          items: {
            data: [
              {
                price: {
                  id: 'price_test',
                },
              },
            ],
          },
          metadata: {
            userId: 'user_123',
          },
        } as any,
      },
      livemode: false,
      pending_webhooks: 0,
      request: null,
    };

    mockVerifyWebhookSignature.mockReturnValue(mockEvent);

    const request = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify(mockEvent),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(mockSubscriptionService.updateSubscription).toHaveBeenCalledWith(
      'user_123',
      expect.objectContaining({
        stripeSubscriptionId: 'sub_test',
        stripeCustomerId: 'cus_test',
        status: 'active',
      })
    );
  });

  it('should handle customer.subscription.deleted event', async () => {
    const mockEvent: Stripe.Event = {
      id: 'evt_test',
      object: 'event',
      api_version: '2023-10-16',
      created: 1234567890,
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_test',
          object: 'subscription',
          metadata: {
            userId: 'user_123',
          },
        } as any,
      },
      livemode: false,
      pending_webhooks: 0,
      request: null,
    };

    mockVerifyWebhookSignature.mockReturnValue(mockEvent);

    const request = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify(mockEvent),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockSubscriptionService.updateSubscription).toHaveBeenCalledWith(
      'user_123',
      expect.objectContaining({
        status: 'canceled',
        canceledAt: expect.any(Date),
      })
    );
  });

  it('should handle invoice.payment_succeeded event', async () => {
    const mockEvent: Stripe.Event = {
      id: 'evt_test',
      object: 'event',
      api_version: '2023-10-16',
      created: 1234567890,
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          id: 'inv_test',
          object: 'invoice',
          subscription: 'sub_test',
          amount_paid: 1999,
          currency: 'usd',
          status_transitions: {
            paid_at: 1234567890,
          },
          metadata: {
            userId: 'user_123',
          },
        } as any,
      },
      livemode: false,
      pending_webhooks: 0,
      request: null,
    };

    mockVerifyWebhookSignature.mockReturnValue(mockEvent);

    const request = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify(mockEvent),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSubscriptionService.recordPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_123',
        subscriptionId: 'sub_test',
        amount: 1999,
        currency: 'usd',
        invoiceId: 'inv_test',
      })
    );
  });

  it('should handle invoice.payment_failed event', async () => {
    const mockEvent: Stripe.Event = {
      id: 'evt_test',
      object: 'event',
      api_version: '2023-10-16',
      created: 1234567890,
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'inv_test',
          object: 'invoice',
          subscription: 'sub_test',
          metadata: {
            userId: 'user_123',
          },
        } as any,
      },
      livemode: false,
      pending_webhooks: 0,
      request: null,
    };

    mockVerifyWebhookSignature.mockReturnValue(mockEvent);

    const request = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify(mockEvent),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSubscriptionService.updateSubscription).toHaveBeenCalledWith(
      'user_123',
      expect.objectContaining({
        status: 'past_due',
      })
    );
  });

  it('should handle checkout.session.completed event', async () => {
    const mockEvent: Stripe.Event = {
      id: 'evt_test',
      object: 'event',
      api_version: '2023-10-16',
      created: 1234567890,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test',
          object: 'checkout.session',
          mode: 'subscription',
          subscription: 'sub_test',
          customer: 'cus_test',
          metadata: {
            userId: 'user_123',
          },
        } as any,
      },
      livemode: false,
      pending_webhooks: 0,
      request: null,
    };

    mockVerifyWebhookSignature.mockReturnValue(mockEvent);

    const request = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify(mockEvent),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSubscriptionService.updateSubscription).toHaveBeenCalledWith(
      'user_123',
      expect.objectContaining({
        stripeSubscriptionId: 'sub_test',
        stripeCustomerId: 'cus_test',
        status: 'active',
      })
    );
  });

  it('should return 400 for invalid signature', async () => {
    // Reset the headers mock to provide a signature
    const { headers } = await import('next/headers');
    vi.mocked(headers).mockReturnValue({
      get: vi.fn((key: string) => key === 'stripe-signature' ? 'bad_signature' : null),
    } as any);
    
    mockVerifyWebhookSignature.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const request = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid signature');
  });

  it('should handle unhandled webhook events gracefully', async () => {
    const mockEvent: Stripe.Event = {
      id: 'evt_test',
      object: 'event',
      api_version: '2023-10-16',
      created: 1234567890,
      type: 'some.unknown.event' as any,
      data: {
        object: {} as any,
      },
      livemode: false,
      pending_webhooks: 0,
      request: null,
    };

    mockVerifyWebhookSignature.mockReturnValue(mockEvent);

    const request = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify(mockEvent),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
  });

  it('should handle customer.created event', async () => {
    const mockEvent: Stripe.Event = {
      id: 'evt_test',
      object: 'event',
      api_version: '2023-10-16',
      created: 1234567890,
      type: 'customer.created',
      data: {
        object: {
          id: 'cus_test',
          object: 'customer',
          email: 'test@example.com',
          metadata: {
            userId: 'user_123',
          },
        } as any,
      },
      livemode: false,
      pending_webhooks: 0,
      request: null,
    };

    mockVerifyWebhookSignature.mockReturnValue(mockEvent);

    const request = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify(mockEvent),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockUserService.updateUser).toHaveBeenCalledWith(
      'user_123',
      expect.objectContaining({
        stripeCustomerId: 'cus_test',
      })
    );
  });

  it('should handle customer.updated event', async () => {
    const mockEvent: Stripe.Event = {
      id: 'evt_test',
      object: 'event',
      api_version: '2023-10-16',
      created: 1234567890,
      type: 'customer.updated',
      data: {
        object: {
          id: 'cus_test',
          object: 'customer',
          email: 'updated@example.com',
          metadata: {
            userId: 'user_123',
          },
        } as any,
      },
      livemode: false,
      pending_webhooks: 0,
      request: null,
    };

    mockVerifyWebhookSignature.mockReturnValue(mockEvent);

    const request = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify(mockEvent),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockUserService.updateUser).toHaveBeenCalledWith(
      'user_123',
      expect.objectContaining({
        stripeCustomerId: 'cus_test',
      })
    );
  });

  it('should handle payment_method.attached event', async () => {
    const mockEvent: Stripe.Event = {
      id: 'evt_test',
      object: 'event',
      api_version: '2023-10-16',
      created: 1234567890,
      type: 'payment_method.attached',
      data: {
        object: {
          id: 'pm_test',
          object: 'payment_method',
          customer: 'cus_test',
          type: 'card',
          card: {
            brand: 'visa',
            last4: '4242',
          },
        } as any,
      },
      livemode: false,
      pending_webhooks: 0,
      request: null,
    };

    mockVerifyWebhookSignature.mockReturnValue(mockEvent);

    const request = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify(mockEvent),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    // Verify the event was passed to the generic handler
    expect(mockHandleWebhookEvent).toHaveBeenCalledWith(mockEvent);
  });

  it('should handle payment_method.detached event', async () => {
    const mockEvent: Stripe.Event = {
      id: 'evt_test',
      object: 'event',
      api_version: '2023-10-16',
      created: 1234567890,
      type: 'payment_method.detached',
      data: {
        object: {
          id: 'pm_test',
          object: 'payment_method',
        } as any,
      },
      livemode: false,
      pending_webhooks: 0,
      request: null,
    };

    mockVerifyWebhookSignature.mockReturnValue(mockEvent);

    const request = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify(mockEvent),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockHandleWebhookEvent).toHaveBeenCalledWith(mockEvent);
  });

  it('should handle subscription with trial period', async () => {
    const mockEvent: Stripe.Event = {
      id: 'evt_test',
      object: 'event',
      api_version: '2023-10-16',
      created: 1234567890,
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_test',
          object: 'subscription',
          customer: 'cus_test',
          status: 'trialing',
          trial_start: 1234567890,
          trial_end: 1234567890 + 14 * 24 * 60 * 60, // 14 days
          current_period_start: 1234567890,
          current_period_end: 1234567890,
          cancel_at_period_end: false,
          items: {
            data: [
              {
                price: {
                  id: 'price_test',
                },
              },
            ],
          },
          metadata: {
            userId: 'user_123',
          },
        } as any,
      },
      livemode: false,
      pending_webhooks: 0,
      request: null,
    };

    mockVerifyWebhookSignature.mockReturnValue(mockEvent);

    const request = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify(mockEvent),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSubscriptionService.updateSubscription).toHaveBeenCalledWith(
      'user_123',
      expect.objectContaining({
        status: 'trialing',
      })
    );
  });

  it('should handle subscription past_due status', async () => {
    const mockEvent: Stripe.Event = {
      id: 'evt_test',
      object: 'event',
      api_version: '2023-10-16',
      created: 1234567890,
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test',
          object: 'subscription',
          customer: 'cus_test',
          status: 'past_due',
          current_period_start: 1234567890,
          current_period_end: 1234567890,
          cancel_at_period_end: false,
          items: {
            data: [
              {
                price: {
                  id: 'price_test',
                },
              },
            ],
          },
          metadata: {
            userId: 'user_123',
          },
        } as any,
      },
      livemode: false,
      pending_webhooks: 0,
      request: null,
    };

    mockVerifyWebhookSignature.mockReturnValue(mockEvent);

    const request = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify(mockEvent),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSubscriptionService.updateSubscription).toHaveBeenCalledWith(
      'user_123',
      expect.objectContaining({
        status: 'past_due',
      })
    );
  });

  it('should handle multiple price items in subscription', async () => {
    const mockEvent: Stripe.Event = {
      id: 'evt_test',
      object: 'event',
      api_version: '2023-10-16',
      created: 1234567890,
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_test',
          object: 'subscription',
          customer: 'cus_test',
          status: 'active',
          current_period_start: 1234567890,
          current_period_end: 1234567890,
          items: {
            data: [
              {
                price: {
                  id: 'price_main',
                },
              },
              {
                price: {
                  id: 'price_addon',
                },
              },
            ],
          },
          metadata: {
            userId: 'user_123',
          },
        } as any,
      },
      livemode: false,
      pending_webhooks: 0,
      request: null,
    };

    mockVerifyWebhookSignature.mockReturnValue(mockEvent);

    const request = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify(mockEvent),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSubscriptionService.updateSubscription).toHaveBeenCalledWith(
      'user_123',
      expect.objectContaining({
        stripePriceId: 'price_main', // Should use first price
      })
    );
  });

  it('should handle subscription cancellation with cancel_at', async () => {
    const cancelAt = 1234567890 + 30 * 24 * 60 * 60; // 30 days later
    const mockEvent: Stripe.Event = {
      id: 'evt_test',
      object: 'event',
      api_version: '2023-10-16',
      created: 1234567890,
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test',
          object: 'subscription',
          customer: 'cus_test',
          status: 'active',
          cancel_at_period_end: true,
          cancel_at: cancelAt,
          canceled_at: 1234567890,
          current_period_start: 1234567890,
          current_period_end: cancelAt,
          items: {
            data: [
              {
                price: {
                  id: 'price_test',
                },
              },
            ],
          },
          metadata: {
            userId: 'user_123',
          },
        } as any,
      },
      livemode: false,
      pending_webhooks: 0,
      request: null,
    };

    mockVerifyWebhookSignature.mockReturnValue(mockEvent);

    const request = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify(mockEvent),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSubscriptionService.updateSubscription).toHaveBeenCalledWith(
      'user_123',
      expect.objectContaining({
        cancelAtPeriodEnd: true,
      })
    );
  });

  it('should skip processing if userId is missing in metadata', async () => {
    const mockEvent: Stripe.Event = {
      id: 'evt_test',
      object: 'event',
      api_version: '2023-10-16',
      created: 1234567890,
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_test',
          object: 'subscription',
          metadata: {}, // No userId
        } as any,
      },
      livemode: false,
      pending_webhooks: 0,
      request: null,
    };

    mockVerifyWebhookSignature.mockReturnValue(mockEvent);

    const request = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify(mockEvent),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSubscriptionService.updateSubscription).not.toHaveBeenCalled();
  });
});