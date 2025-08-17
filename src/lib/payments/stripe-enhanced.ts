import Stripe from 'stripe';

let cachedStripe: Stripe | null = null;

/**
 * Get or initialize Stripe instance
 */
export function getStripe(): Stripe {
  if (cachedStripe) return cachedStripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set in environment variables.');
  }
  cachedStripe = new Stripe(key, { apiVersion: '2023-10-16' });
  return cachedStripe;
}

// ============================================
// Customer Management
// ============================================

/**
 * Create or update a Stripe customer
 */
export async function createOrUpdateCustomer(params: {
  email: string;
  userId: string;
  name?: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Customer> {
  const stripe = getStripe();
  
  // Check if customer already exists
  const existingCustomers = await stripe.customers.list({
    email: params.email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    // Update existing customer
    return stripe.customers.update(existingCustomers.data[0].id, {
      name: params.name,
      metadata: {
        ...params.metadata,
        userId: params.userId,
      },
    });
  }

  // Create new customer
  return stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: {
      ...params.metadata,
      userId: params.userId,
    },
  });
}

/**
 * Get customer by user ID
 */
export async function getCustomerByUserId(userId: string): Promise<Stripe.Customer | null> {
  const stripe = getStripe();
  const customers = await stripe.customers.search({
    query: `metadata['userId']:'${userId}'`,
    limit: 1,
  });
  
  return customers.data[0] || null;
}

// ============================================
// Customer Portal Management
// ============================================

/**
 * Create a customer portal session for subscription management
 */
export async function createCustomerPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripe();
  
  return stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });
}

/**
 * Configure customer portal settings
 */
export async function configureCustomerPortal(): Promise<Stripe.BillingPortal.Configuration> {
  const stripe = getStripe();
  
  // Check if configuration already exists
  const configurations = await stripe.billingPortal.configurations.list({ limit: 1 });
  
  if (configurations.data.length > 0) {
    return configurations.data[0];
  }
  
  // Create new configuration
  return stripe.billingPortal.configurations.create({
    business_profile: {
      headline: 'Manage your subscription',
      privacy_policy_url: `${process.env.NEXT_PUBLIC_APP_URL}/privacy`,
      terms_of_service_url: `${process.env.NEXT_PUBLIC_APP_URL}/terms`,
    },
    features: {
      customer_update: {
        enabled: true,
        allowed_updates: ['email', 'name', 'address', 'phone', 'tax_id'],
      },
      invoice_history: {
        enabled: true,
      },
      payment_method_update: {
        enabled: true,
      },
      subscription_cancel: {
        enabled: true,
        mode: 'at_period_end',
        cancellation_reason: {
          enabled: true,
          options: [
            'too_expensive',
            'missing_features',
            'switched_service',
            'unused',
            'other',
          ],
        },
      },
      subscription_pause: {
        enabled: false, // Can be enabled if needed
      },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ['price', 'quantity'],
        proration_behavior: 'create_prorations',
      },
    },
  });
}

// ============================================
// Invoice Management
// ============================================

/**
 * Get invoices for a customer
 */
export async function getCustomerInvoices(params: {
  customerId: string;
  limit?: number;
  startingAfter?: string;
}): Promise<Stripe.ApiList<Stripe.Invoice>> {
  const stripe = getStripe();
  
  return stripe.invoices.list({
    customer: params.customerId,
    limit: params.limit || 10,
    starting_after: params.startingAfter,
  });
}

/**
 * Get a specific invoice
 */
export async function getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
  const stripe = getStripe();
  return stripe.invoices.retrieve(invoiceId);
}

/**
 * Download invoice as PDF
 */
export async function getInvoicePdfUrl(invoiceId: string): Promise<string | null> {
  const stripe = getStripe();
  const invoice = await stripe.invoices.retrieve(invoiceId);
  return invoice.invoice_pdf || null;
}

/**
 * Send invoice via email
 */
export async function sendInvoice(invoiceId: string): Promise<Stripe.Invoice> {
  const stripe = getStripe();
  return stripe.invoices.sendInvoice(invoiceId);
}

// ============================================
// Subscription Management
// ============================================

/**
 * Create a subscription with trial period
 */
export async function createSubscription(params: {
  customerId: string;
  priceId: string;
  trialDays?: number;
  metadata?: Record<string, string>;
}): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  
  return stripe.subscriptions.create({
    customer: params.customerId,
    items: [{ price: params.priceId }],
    trial_period_days: params.trialDays,
    metadata: params.metadata,
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  });
}

/**
 * Update subscription
 */
export async function updateSubscription(params: {
  subscriptionId: string;
  priceId?: string;
  quantity?: number;
  metadata?: Record<string, string>;
}): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  
  const updateData: Stripe.SubscriptionUpdateParams = {
    metadata: params.metadata,
  };
  
  if (params.priceId) {
    const subscription = await stripe.subscriptions.retrieve(params.subscriptionId);
    updateData.items = [{
      id: subscription.items.data[0].id,
      price: params.priceId,
      quantity: params.quantity,
    }];
  }
  
  return stripe.subscriptions.update(params.subscriptionId, updateData);
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediately = false
): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  
  if (immediately) {
    return stripe.subscriptions.cancel(subscriptionId);
  }
  
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Resume a canceled subscription
 */
export async function resumeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

// ============================================
// Payment Method Management
// ============================================

/**
 * Attach a payment method to customer
 */
export async function attachPaymentMethod(params: {
  paymentMethodId: string;
  customerId: string;
}): Promise<Stripe.PaymentMethod> {
  const stripe = getStripe();
  
  return stripe.paymentMethods.attach(params.paymentMethodId, {
    customer: params.customerId,
  });
}

/**
 * Set default payment method for customer
 */
export async function setDefaultPaymentMethod(params: {
  customerId: string;
  paymentMethodId: string;
}): Promise<Stripe.Customer> {
  const stripe = getStripe();
  
  return stripe.customers.update(params.customerId, {
    invoice_settings: {
      default_payment_method: params.paymentMethodId,
    },
  });
}

/**
 * Get payment methods for customer
 */
export async function getPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
  const stripe = getStripe();
  
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });
  
  return paymentMethods.data;
}

/**
 * Detach payment method
 */
export async function detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
  const stripe = getStripe();
  return stripe.paymentMethods.detach(paymentMethodId);
}

// ============================================
// Webhook Handling
// ============================================

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(params: {
  payload: string | Buffer;
  signature: string;
  secret: string;
}): Stripe.Event {
  const stripe = getStripe();
  
  return stripe.webhooks.constructEvent(
    params.payload,
    params.signature,
    params.secret
  );
}

/**
 * Handle webhook event with proper typing
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = event.data.object as Stripe.Subscription;
      // Handle subscription changes
      console.log('Subscription event:', event.type, subscription.id);
      break;
      
    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed':
      const invoice = event.data.object as Stripe.Invoice;
      // Handle invoice events
      console.log('Invoice event:', event.type, invoice.id);
      break;
      
    case 'payment_method.attached':
    case 'payment_method.detached':
      const paymentMethod = event.data.object as Stripe.PaymentMethod;
      // Handle payment method events
      console.log('Payment method event:', event.type, paymentMethod.id);
      break;
      
    default:
      console.log('Unhandled webhook event:', event.type);
  }
}

// ============================================
// Checkout Session
// ============================================

/**
 * Create checkout session for new subscription
 */
export async function createCheckoutSession(params: {
  customerId?: string;
  customerEmail?: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
  metadata?: Record<string, string>;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  
  return stripe.checkout.sessions.create({
    customer: params.customerId,
    customer_email: params.customerId ? undefined : params.customerEmail,
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    subscription_data: {
      trial_period_days: params.trialDays,
      metadata: params.metadata,
    },
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    payment_method_collection: 'if_required',
  });
}

/**
 * Create setup intent for adding payment method without payment
 */
export async function createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
  const stripe = getStripe();
  
  return stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    usage: 'off_session',
  });
}

// Export all functions
export default {
  getStripe,
  createOrUpdateCustomer,
  getCustomerByUserId,
  createCustomerPortalSession,
  configureCustomerPortal,
  getCustomerInvoices,
  getInvoice,
  getInvoicePdfUrl,
  sendInvoice,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  resumeSubscription,
  attachPaymentMethod,
  setDefaultPaymentMethod,
  getPaymentMethods,
  detachPaymentMethod,
  verifyWebhookSignature,
  handleWebhookEvent,
  createCheckoutSession,
  createSetupIntent,
};