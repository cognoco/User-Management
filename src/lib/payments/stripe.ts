import Stripe from 'stripe';

let cachedStripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (cachedStripe) return cachedStripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    // Lazily throw when actually used, avoiding build-time failures
    throw new Error('STRIPE_SECRET_KEY is not set in environment variables.');
  }
  cachedStripe = new Stripe(key, { apiVersion: '2023-10-16' });
  return cachedStripe;
}

// Example: Create a customer
export async function createCustomer(params: Stripe.CustomerCreateParams) {
  return getStripe().customers.create(params);
}

// Example: Create a subscription
export async function createSubscription(params: Stripe.SubscriptionCreateParams) {
  return getStripe().subscriptions.create(params);
}

// Example: Retrieve a subscription
export async function getSubscription(subscriptionId: string) {
  return getStripe().subscriptions.retrieve(subscriptionId);
}

// Example: Create a checkout session
export async function createCheckoutSession(params: Stripe.Checkout.SessionCreateParams) {
  return getStripe().checkout.sessions.create(params);
}

// Example: Create a billing portal session
export async function createBillingPortalSession(
  params: Stripe.BillingPortal.SessionCreateParams
) {
  return getStripe().billingPortal.sessions.create(params);
}

// Add more helpers as needed for your flows