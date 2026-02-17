import Stripe from 'stripe';

// IMPORTANT: Set STRIPE_SECRET_KEY in your .env file (never expose this to the frontend)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables.');
}

// Use the latest Stripe API version
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-05-28.basil',
});

// Example: Create a customer
export async function createCustomer(params: Stripe.CustomerCreateParams) {
  return stripe.customers.create(params);
}

// Example: Create a subscription
export async function createSubscription(params: Stripe.SubscriptionCreateParams) {
  return stripe.subscriptions.create(params);
}

// Example: Retrieve a subscription
export async function getSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId);
}

// Example: Create a checkout session
export async function createCheckoutSession(params: Stripe.Checkout.SessionCreateParams) {
  return stripe.checkout.sessions.create(params);
}

// Example: Create a billing portal session
export async function createBillingPortalSession(
  params: Stripe.BillingPortal.SessionCreateParams
) {
  return stripe.billingPortal.sessions.create(params);
}

// Add more helpers as needed for your flows 