import { getSubscription as getStripeSubscription, createCustomer, createSubscription } from '@/lib/payments/stripe';
import { createSupabaseSubscriptionProvider } from '@/adapters/subscription/factory';
import { z } from 'zod';
import { NextResponse, type NextRequest } from 'next/server';
import { withRouteAuth, type RouteAuthContext } from '@/middleware/auth';

const SubscriptionSchema = z.object({ plan: z.string() });

async function handleGet(_req: NextRequest, auth: RouteAuthContext) {
  const provider = createSupabaseSubscriptionProvider({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!
  });
  // Fetch subscription from DB
  const subscription = await provider.getUserSubscription(auth.userId!);
  if (!subscription) {
    return NextResponse.json({ subscription: null });
  }
  // Optionally fetch from Stripe for up-to-date status
  let stripeSub = null;
  if (subscription.stripe_subscription_id) {
    try {
      stripeSub = await getStripeSubscription(subscription.stripe_subscription_id);
    } catch (e) {
      // Ignore if not found
    }
  }
  return NextResponse.json({ subscription, stripe: stripeSub });
}

export const GET = (req: NextRequest) =>
  withRouteAuth((r, auth) => handleGet(r, auth), req);

async function handlePost(request: NextRequest, auth: RouteAuthContext) {
  const provider = createSupabaseSubscriptionProvider({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!
  });
  const body = await request.json();
  const parse = SubscriptionSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  // Check if user already has a Stripe customer
  let customerId = null;
  const existing = await provider.getUserSubscription(auth.userId!);
  if (existing && (existing as any).customer_id) {
    customerId = (existing as any).customer_id;
  } else {
    // Create Stripe customer
    const customer = await createCustomer({
      email: auth.user?.email || '',
      metadata: { user_id: auth.userId! },
    });
    customerId = customer.id;
  }
  // Create Stripe subscription
  // You must map plan to a Stripe price ID
  const priceId = parse.data.plan; // In production, validate this is a real price ID
  let stripeSub;
  try {
    stripeSub = await createSubscription({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Stripe error' }, { status: 400 });
  }
  await provider.upsertSubscription({
    userId: auth.userId!,
    planId: priceId,
    id: existing?.id,
    status: stripeSub.status,
    startDate: new Date().toISOString(),
  });
  return NextResponse.json({ success: true, subscription: stripeSub });
}

export const POST = (req: NextRequest) =>
  withRouteAuth((r, auth) => handlePost(r, auth), req, { includeUser: true });
