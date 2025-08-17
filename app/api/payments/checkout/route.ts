import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession, getCustomerByUserId, createOrUpdateCustomer } from '@/lib/payments/stripe-enhanced';
import { getServerSession } from '@/lib/auth';

/**
 * POST /api/payments/checkout
 * Create a Stripe checkout session for subscription
 */
export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { 
      priceId, 
      successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings/subscription?success=true`,
      cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings/subscription?canceled=true`,
      trialDays,
      quantity = 1
    } = body;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    let customer = await getCustomerByUserId(session.user.id);
    
    if (!customer) {
      // Create customer if doesn't exist
      customer = await createOrUpdateCustomer({
        email: session.user.email!,
        userId: session.user.id,
        name: session.user.name || undefined,
      });
    }

    // Create checkout session
    const checkoutSession = await createCheckoutSession({
      customerId: customer.id,
      priceId,
      successUrl,
      cancelUrl,
      trialDays,
      metadata: {
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments/checkout
 * Get checkout session status
 */
export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get checkout session from Stripe
    const { getStripe } = await import('@/lib/payments/stripe-enhanced');
    const stripe = getStripe();
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify the session belongs to the user
    const customer = await getCustomerByUserId(session.user.id);
    if (!customer || checkoutSession.customer !== customer.id) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: checkoutSession.status,
      payment_status: checkoutSession.payment_status,
      subscription: checkoutSession.subscription,
      customer_email: checkoutSession.customer_email,
      amount_total: checkoutSession.amount_total,
      currency: checkoutSession.currency,
    });
  } catch (error) {
    console.error('Error retrieving checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve checkout session' },
      { status: 500 }
    );
  }
}