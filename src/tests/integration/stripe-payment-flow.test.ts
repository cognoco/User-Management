import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getStripe, createOrUpdateCustomer, createCheckoutSession, handleWebhookEvent } from '@/lib/payments/stripe-enhanced';
import { getSubscriptionService } from '@/services/subscription/subscription.factory';
import type Stripe from 'stripe';

// Mock Stripe
vi.mock('stripe', () => {
  const mockStripe = {
    customers: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      retrieve: vi.fn(),
    },
    checkout: {
      sessions: {
        create: vi.fn(),
        retrieve: vi.fn(),
        list: vi.fn(),
      },
    },
    subscriptions: {
      create: vi.fn(),
      update: vi.fn(),
      del: vi.fn(),
      retrieve: vi.fn(),
    },
    invoices: {
      list: vi.fn(),
      retrieve: vi.fn(),
      sendInvoice: vi.fn(),
      pay: vi.fn(),
    },
    paymentMethods: {
      list: vi.fn(),
      attach: vi.fn(),
      detach: vi.fn(),
      update: vi.fn(),
    },
    billingPortal: {
      sessions: {
        create: vi.fn(),
      },
    },
    webhookEndpoints: {
      create: vi.fn(),
      list: vi.fn(),
    },
  };

  return {
    default: vi.fn(() => mockStripe),
    Stripe: vi.fn(() => mockStripe),
  };
});

// Mock subscription service
vi.mock('@/services/subscription/subscription.factory');

describe('Stripe Payment Flow Integration', () => {
  let mockStripeInstance: any;
  let mockSubscriptionService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup environment
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_mock';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    
    // Get mocked Stripe instance
    mockStripeInstance = getStripe();
    
    // Setup subscription service mock
    mockSubscriptionService = {
      getSubscription: vi.fn(),
      createSubscription: vi.fn(),
      updateSubscription: vi.fn(),
      recordPayment: vi.fn(),
    };
    vi.mocked(getSubscriptionService).mockReturnValue(mockSubscriptionService);
  });

  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  describe('Customer Management', () => {
    it('should create a new customer', async () => {
      const mockCustomer = {
        id: 'cus_test123',
        email: 'test@example.com',
        metadata: { userId: 'user_123' },
      };

      mockStripeInstance.customers.list.mockResolvedValue({ data: [] });
      mockStripeInstance.customers.create.mockResolvedValue(mockCustomer);

      const customer = await createOrUpdateCustomer({
        email: 'test@example.com',
        userId: 'user_123',
        name: 'Test User',
      });

      expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        metadata: { userId: 'user_123' },
      });
      expect(customer).toEqual(mockCustomer);
    });

    it('should update existing customer', async () => {
      const existingCustomer = {
        id: 'cus_existing',
        email: 'test@example.com',
      };
      const updatedCustomer = {
        ...existingCustomer,
        name: 'Updated Name',
        metadata: { userId: 'user_123' },
      };

      mockStripeInstance.customers.list.mockResolvedValue({ data: [existingCustomer] });
      mockStripeInstance.customers.update.mockResolvedValue(updatedCustomer);

      const customer = await createOrUpdateCustomer({
        email: 'test@example.com',
        userId: 'user_123',
        name: 'Updated Name',
      });

      expect(mockStripeInstance.customers.update).toHaveBeenCalledWith(
        'cus_existing',
        {
          name: 'Updated Name',
          metadata: { userId: 'user_123' },
        }
      );
      expect(customer).toEqual(updatedCustomer);
    });
  });

  describe('Checkout Session', () => {
    it('should create checkout session for new subscription', async () => {
      const mockSession = {
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/pay/cs_test123',
        mode: 'subscription',
        customer: 'cus_test123',
      };

      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession);

      const session = await createCheckoutSession({
        priceId: 'price_pro',
        customerId: 'cus_test123',
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/cancel',
        metadata: { userId: 'user_123' },
      });

      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: 'price_pro', quantity: 1 }],
        customer: 'cus_test123',
        success_url: 'http://localhost:3000/success',
        cancel_url: 'http://localhost:3000/cancel',
        metadata: { userId: 'user_123' },
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
      });
      expect(session).toEqual(mockSession);
    });

    it('should create one-time payment session', async () => {
      const mockSession = {
        id: 'cs_payment123',
        url: 'https://checkout.stripe.com/pay/cs_payment123',
        mode: 'payment',
      };

      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession);

      const session = await createCheckoutSession({
        priceId: 'price_onetime',
        mode: 'payment',
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/cancel',
      });

      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          line_items: [{ price: 'price_onetime', quantity: 1 }],
        })
      );
      expect(session).toEqual(mockSession);
    });
  });

  describe('Webhook Event Processing', () => {
    it('should process subscription created event', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test123',
            customer: 'cus_test123',
            status: 'active',
            items: {
              data: [{ price: { id: 'price_pro' } }],
            },
            metadata: { userId: 'user_123' },
          } as any,
        },
      };

      await handleWebhookEvent(mockEvent as Stripe.Event);

      expect(mockSubscriptionService.updateSubscription).toHaveBeenCalledWith(
        'user_123',
        expect.objectContaining({
          stripeSubscriptionId: 'sub_test123',
          stripeCustomerId: 'cus_test123',
          status: 'active',
          stripePriceId: 'price_pro',
        })
      );
    });

    it('should process payment succeeded event', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'inv_test123',
            subscription: 'sub_test123',
            amount_paid: 2999,
            currency: 'usd',
            metadata: { userId: 'user_123' },
          } as any,
        },
      };

      await handleWebhookEvent(mockEvent as Stripe.Event);

      expect(mockSubscriptionService.recordPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          subscriptionId: 'sub_test123',
          amount: 2999,
          currency: 'usd',
          invoiceId: 'inv_test123',
        })
      );
    });

    it('should process subscription cancelled event', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test123',
            metadata: { userId: 'user_123' },
          } as any,
        },
      };

      await handleWebhookEvent(mockEvent as Stripe.Event);

      expect(mockSubscriptionService.updateSubscription).toHaveBeenCalledWith(
        'user_123',
        expect.objectContaining({
          status: 'canceled',
          canceledAt: expect.any(Date),
        })
      );
    });

    it('should handle checkout session completed', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test123',
            mode: 'subscription',
            subscription: 'sub_test123',
            customer: 'cus_test123',
            metadata: { userId: 'user_123' },
          } as any,
        },
      };

      await handleWebhookEvent(mockEvent as Stripe.Event);

      expect(mockSubscriptionService.updateSubscription).toHaveBeenCalledWith(
        'user_123',
        expect.objectContaining({
          stripeSubscriptionId: 'sub_test123',
          stripeCustomerId: 'cus_test123',
          status: 'active',
        })
      );
    });
  });

  describe('End-to-End Payment Flow', () => {
    it('should complete full subscription flow', async () => {
      // 1. Create customer
      const mockCustomer = {
        id: 'cus_new123',
        email: 'newuser@example.com',
        metadata: { userId: 'user_new' },
      };
      mockStripeInstance.customers.list.mockResolvedValue({ data: [] });
      mockStripeInstance.customers.create.mockResolvedValue(mockCustomer);

      const customer = await createOrUpdateCustomer({
        email: 'newuser@example.com',
        userId: 'user_new',
        name: 'New User',
      });

      expect(customer.id).toBe('cus_new123');

      // 2. Create checkout session
      const mockSession = {
        id: 'cs_new123',
        url: 'https://checkout.stripe.com/pay/cs_new123',
        customer: 'cus_new123',
      };
      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession);

      const session = await createCheckoutSession({
        priceId: 'price_pro',
        customerId: customer.id,
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/cancel',
        metadata: { userId: 'user_new' },
      });

      expect(session.url).toBe('https://checkout.stripe.com/pay/cs_new123');

      // 3. Simulate webhook for completed checkout
      const checkoutCompleteEvent: Partial<Stripe.Event> = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_new123',
            mode: 'subscription',
            subscription: 'sub_new123',
            customer: 'cus_new123',
            metadata: { userId: 'user_new' },
          } as any,
        },
      };

      await handleWebhookEvent(checkoutCompleteEvent as Stripe.Event);

      // 4. Verify subscription was created
      expect(mockSubscriptionService.updateSubscription).toHaveBeenCalledWith(
        'user_new',
        expect.objectContaining({
          stripeSubscriptionId: 'sub_new123',
          stripeCustomerId: 'cus_new123',
          status: 'active',
        })
      );

      // 5. Simulate first payment
      const paymentEvent: Partial<Stripe.Event> = {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'inv_new123',
            subscription: 'sub_new123',
            amount_paid: 2999,
            currency: 'usd',
            metadata: { userId: 'user_new' },
          } as any,
        },
      };

      await handleWebhookEvent(paymentEvent as Stripe.Event);

      // 6. Verify payment was recorded
      expect(mockSubscriptionService.recordPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_new',
          subscriptionId: 'sub_new123',
          amount: 2999,
          invoiceId: 'inv_new123',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle missing Stripe key', () => {
      delete process.env.STRIPE_SECRET_KEY;
      
      expect(() => getStripe()).toThrow('STRIPE_SECRET_KEY is not set');
    });

    it('should handle webhook events without userId gracefully', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_no_user',
            customer: 'cus_test',
            metadata: {}, // No userId
          } as any,
        },
      };

      await handleWebhookEvent(mockEvent as Stripe.Event);

      // Should not call update subscription without userId
      expect(mockSubscriptionService.updateSubscription).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockStripeInstance.customers.create.mockRejectedValue(
        new Error('Stripe API Error')
      );

      await expect(
        createOrUpdateCustomer({
          email: 'test@example.com',
          userId: 'user_123',
        })
      ).rejects.toThrow('Stripe API Error');
    });
  });
});