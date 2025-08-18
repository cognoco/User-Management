import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type Stripe from 'stripe';

// Create mock Stripe instance
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
    },
  },
  subscriptions: {
    create: vi.fn(),
    update: vi.fn(),
    del: vi.fn(),
    cancel: vi.fn(),
    retrieve: vi.fn(),
  },
  invoices: {
    list: vi.fn(),
    retrieve: vi.fn(),
    sendInvoice: vi.fn(),
  },
  paymentMethods: {
    list: vi.fn(),
    attach: vi.fn(),
    detach: vi.fn(),
  },
  billingPortal: {
    sessions: {
      create: vi.fn(),
    },
  },
};

// Mock Stripe module
vi.mock('stripe', () => {
  return {
    default: vi.fn(() => mockStripe),
  };
});

// Mock subscription service
vi.mock('@/services/subscription/subscription.factory', () => ({
  getSubscriptionService: vi.fn(() => ({
    getSubscription: vi.fn(),
    createSubscription: vi.fn(),
    updateSubscription: vi.fn(),
    recordPayment: vi.fn(),
  })),
}));

describe('Stripe Service Integration', () => {
  let stripeEnhanced: any;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_mock';
    
    // Import after setting env vars
    stripeEnhanced = await import('@/lib/payments/stripe-enhanced');
  });

  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    vi.resetModules();
  });

  describe('Customer Management', () => {
    it('should create a new customer', async () => {
      const mockCustomer = {
        id: 'cus_test123',
        email: 'test@example.com',
        metadata: { userId: 'user_123' },
      };

      mockStripe.customers.list.mockResolvedValue({ data: [] });
      mockStripe.customers.create.mockResolvedValue(mockCustomer);

      const customer = await stripeEnhanced.createOrUpdateCustomer({
        email: 'test@example.com',
        userId: 'user_123',
        name: 'Test User',
      });

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
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

      mockStripe.customers.list.mockResolvedValue({ data: [existingCustomer] });
      mockStripe.customers.update.mockResolvedValue(updatedCustomer);

      const customer = await stripeEnhanced.createOrUpdateCustomer({
        email: 'test@example.com',
        userId: 'user_123',
        name: 'Updated Name',
      });

      expect(mockStripe.customers.update).toHaveBeenCalledWith(
        'cus_existing',
        {
          name: 'Updated Name',
          metadata: { userId: 'user_123' },
        }
      );
      expect(customer).toEqual(updatedCustomer);
    });
  });

  describe('Checkout Sessions', () => {
    it('should create subscription checkout session', async () => {
      const mockSession = {
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/pay/cs_test123',
        mode: 'subscription',
        customer: 'cus_test123',
      };

      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      const session = await stripeEnhanced.createCheckoutSession({
        priceId: 'price_pro',
        customerId: 'cus_test123',
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/cancel',
        metadata: { userId: 'user_123' },
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_test123',
        customer_email: undefined,
        line_items: [{ price: 'price_pro', quantity: 1 }],
        mode: 'subscription',
        success_url: 'http://localhost:3000/success',
        cancel_url: 'http://localhost:3000/cancel',
        subscription_data: {
          trial_period_days: undefined,
          metadata: { userId: 'user_123' },
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        payment_method_collection: 'if_required',
      });
      expect(session).toEqual(mockSession);
    });

    it('should create checkout session with email', async () => {
      const mockSession = {
        id: 'cs_payment123',
        url: 'https://checkout.stripe.com/pay/cs_payment123',
        mode: 'subscription',
      };

      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      const session = await stripeEnhanced.createCheckoutSession({
        priceId: 'price_onetime',
        customerEmail: 'new@example.com',
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/cancel',
        trialDays: 7,
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: undefined,
          customer_email: 'new@example.com',
          line_items: [{ price: 'price_onetime', quantity: 1 }],
          subscription_data: {
            trial_period_days: 7,
            metadata: undefined,
          },
        })
      );
      expect(session).toEqual(mockSession);
    });

  });

  describe('Subscription Management', () => {
    it('should create subscription', async () => {
      const mockSubscription = {
        id: 'sub_test123',
        customer: 'cus_test123',
        status: 'active',
        items: {
          data: [{ price: { id: 'price_pro' } }],
        },
      };

      mockStripe.subscriptions.create.mockResolvedValue(mockSubscription);

      const subscription = await stripeEnhanced.createSubscription({
        customerId: 'cus_test123',
        priceId: 'price_pro',
        trialDays: 14,
      });

      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith({
        customer: 'cus_test123',
        items: [{ price: 'price_pro' }],
        trial_period_days: 14,
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });
      expect(subscription).toEqual(mockSubscription);
    });

    it('should update subscription', async () => {
      const mockSubscription = {
        id: 'sub_test123',
        items: {
          data: [{ id: 'si_test123', price: { id: 'price_old' } }],
        },
      };
      const updatedSubscription = {
        ...mockSubscription,
        items: {
          data: [{ id: 'si_test123', price: { id: 'price_new' } }],
        },
      };

      mockStripe.subscriptions.retrieve.mockResolvedValue(mockSubscription);
      mockStripe.subscriptions.update.mockResolvedValue(updatedSubscription);

      const subscription = await stripeEnhanced.updateSubscription({
        subscriptionId: 'sub_test123',
        priceId: 'price_new',
        quantity: 1,
      });

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_test123', {
        items: [{
          id: 'si_test123',
          price: 'price_new',
          quantity: 1,
        }],
        metadata: undefined,
      });
      expect(subscription).toEqual(updatedSubscription);
    });

    it('should cancel subscription at period end', async () => {
      const cancelledSubscription = {
        id: 'sub_test123',
        cancel_at_period_end: true,
      };

      mockStripe.subscriptions.update.mockResolvedValue(cancelledSubscription);

      const subscription = await stripeEnhanced.cancelSubscription('sub_test123');

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_test123', {
        cancel_at_period_end: true,
      });
      expect(subscription).toEqual(cancelledSubscription);
    });

    it('should cancel subscription immediately', async () => {
      const cancelledSubscription = {
        id: 'sub_test123',
        status: 'canceled',
      };

      mockStripe.subscriptions.cancel.mockResolvedValue(cancelledSubscription);

      const subscription = await stripeEnhanced.cancelSubscription('sub_test123', true);

      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_test123');
      expect(subscription).toEqual(cancelledSubscription);
    });
  });

  describe('Invoice Management', () => {
    it('should list invoices for customer', async () => {
      const mockInvoices = {
        data: [
          {
            id: 'inv_test1',
            amount_due: 1999,
            status: 'paid',
          },
          {
            id: 'inv_test2',
            amount_due: 1999,
            status: 'open',
          },
        ],
        has_more: false,
      };

      mockStripe.invoices.list.mockResolvedValue(mockInvoices);

      const invoices = await stripeEnhanced.getCustomerInvoices({
        customerId: 'cus_test123',
        limit: 10,
      });

      expect(mockStripe.invoices.list).toHaveBeenCalledWith({
        customer: 'cus_test123',
        limit: 10,
        starting_after: undefined,
      });
      expect(invoices).toEqual(mockInvoices);
    });

    it('should send invoice', async () => {
      const mockInvoice = {
        id: 'inv_test123',
        status: 'open',
      };

      mockStripe.invoices.sendInvoice.mockResolvedValue(mockInvoice);

      const invoice = await stripeEnhanced.sendInvoice('inv_test123');

      expect(mockStripe.invoices.sendInvoice).toHaveBeenCalledWith('inv_test123');
      expect(invoice).toEqual(mockInvoice);
    });
  });

  describe('Payment Methods', () => {
    it('should list payment methods', async () => {
      const mockPaymentMethods = {
        data: [
          {
            id: 'pm_test1',
            type: 'card',
            card: { brand: 'visa', last4: '4242' },
          },
        ],
      };

      mockStripe.paymentMethods.list.mockResolvedValue(mockPaymentMethods);

      const methods = await stripeEnhanced.getPaymentMethods('cus_test123');

      expect(mockStripe.paymentMethods.list).toHaveBeenCalledWith({
        customer: 'cus_test123',
        type: 'card',
      });
      expect(methods).toEqual(mockPaymentMethods.data);
    });

    it('should attach payment method', async () => {
      const mockPaymentMethod = {
        id: 'pm_test123',
        customer: 'cus_test123',
      };

      mockStripe.paymentMethods.attach.mockResolvedValue(mockPaymentMethod);

      const method = await stripeEnhanced.attachPaymentMethod({
        paymentMethodId: 'pm_test123',
        customerId: 'cus_test123',
      });

      expect(mockStripe.paymentMethods.attach).toHaveBeenCalledWith('pm_test123', {
        customer: 'cus_test123',
      });
      expect(method).toEqual(mockPaymentMethod);
    });

    it('should set default payment method', async () => {
      const updatedCustomer = {
        id: 'cus_test123',
        invoice_settings: {
          default_payment_method: 'pm_test123',
        },
      };

      mockStripe.customers.update.mockResolvedValue(updatedCustomer);

      const customer = await stripeEnhanced.setDefaultPaymentMethod({
        customerId: 'cus_test123',
        paymentMethodId: 'pm_test123',
      });

      expect(mockStripe.customers.update).toHaveBeenCalledWith('cus_test123', {
        invoice_settings: {
          default_payment_method: 'pm_test123',
        },
      });
      expect(customer).toEqual(updatedCustomer);
    });
  });

  describe('Customer Portal', () => {
    it('should create portal session', async () => {
      const mockPortalSession = {
        id: 'bps_test123',
        url: 'https://billing.stripe.com/session/test123',
      };

      mockStripe.billingPortal.sessions.create.mockResolvedValue(mockPortalSession);

      const session = await stripeEnhanced.createCustomerPortalSession({
        customerId: 'cus_test123',
        returnUrl: 'http://localhost:3000/account',
      });

      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_test123',
        return_url: 'http://localhost:3000/account',
      });
      expect(session).toEqual(mockPortalSession);
    });
  });

  describe('Webhook Event Handling', () => {
    it('should handle subscription created event', async () => {
      const { getSubscriptionService } = await import('@/services/subscription/subscription.factory');
      const mockService = vi.mocked(getSubscriptionService)();

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

      await stripeEnhanced.handleWebhookEvent(mockEvent as Stripe.Event);

      expect(mockService.updateSubscription).toHaveBeenCalledWith(
        'user_123',
        expect.objectContaining({
          stripeSubscriptionId: 'sub_test123',
          stripeCustomerId: 'cus_test123',
          status: 'active',
          stripePriceId: 'price_pro',
        })
      );
    });

    it('should handle payment succeeded event', async () => {
      const { getSubscriptionService } = await import('@/services/subscription/subscription.factory');
      const mockService = vi.mocked(getSubscriptionService)();

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

      await stripeEnhanced.handleWebhookEvent(mockEvent as Stripe.Event);

      expect(mockService.recordPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          subscriptionId: 'sub_test123',
          amount: 2999,
          currency: 'usd',
          invoiceId: 'inv_test123',
        })
      );
    });

    it('should skip events without userId', async () => {
      const { getSubscriptionService } = await import('@/services/subscription/subscription.factory');
      const mockService = vi.mocked(getSubscriptionService)();

      const mockEvent: Partial<Stripe.Event> = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test123',
            metadata: {}, // No userId
          } as any,
        },
      };

      await stripeEnhanced.handleWebhookEvent(mockEvent as Stripe.Event);

      expect(mockService.updateSubscription).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when Stripe key is missing', async () => {
      delete process.env.STRIPE_SECRET_KEY;
      vi.resetModules();
      
      await expect(async () => {
        const module = await import('@/lib/payments/stripe-enhanced');
        module.getStripe();
      }).rejects.toThrow('STRIPE_SECRET_KEY is not set');
    });
  });
});