import { NextRequest, NextResponse } from 'next/server';
import { 
  getCustomerByUserId,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  resumeSubscription,
  getStripe
} from '@/lib/payments/stripe-enhanced';
import { getServerSession } from '@/lib/auth';
import { getSubscriptionService } from '@/services/subscription/subscription.factory';

/**
 * GET /api/payments/subscription
 * Get current subscription for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get subscription from database
    const subscriptionService = getSubscriptionService();
    const subscription = await subscriptionService.getSubscription(session.user.id);

    if (!subscription || !subscription.stripeSubscriptionId) {
      return NextResponse.json({
        subscription: null,
        message: 'No active subscription',
      });
    }

    // Get details from Stripe
    const stripe = getStripe();
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId,
      {
        expand: ['latest_invoice', 'customer', 'default_payment_method'],
      }
    );

    return NextResponse.json({
      subscription: {
        id: stripeSubscription.id,
        status: stripeSubscription.status,
        current_period_start: stripeSubscription.current_period_start,
        current_period_end: stripeSubscription.current_period_end,
        cancel_at_period_end: stripeSubscription.cancel_at_period_end,
        canceled_at: stripeSubscription.canceled_at,
        trial_start: stripeSubscription.trial_start,
        trial_end: stripeSubscription.trial_end,
        items: stripeSubscription.items.data.map(item => ({
          id: item.id,
          price: {
            id: item.price.id,
            product: item.price.product,
            unit_amount: item.price.unit_amount,
            currency: item.price.currency,
            recurring: item.price.recurring,
          },
          quantity: item.quantity,
        })),
        latest_invoice: stripeSubscription.latest_invoice ? {
          id: (stripeSubscription.latest_invoice as any).id,
          status: (stripeSubscription.latest_invoice as any).status,
          amount_due: (stripeSubscription.latest_invoice as any).amount_due,
          amount_paid: (stripeSubscription.latest_invoice as any).amount_paid,
        } : null,
        payment_method: stripeSubscription.default_payment_method ? {
          id: (stripeSubscription.default_payment_method as any).id,
          type: (stripeSubscription.default_payment_method as any).type,
          card: (stripeSubscription.default_payment_method as any).card,
        } : null,
      },
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payments/subscription
 * Create a new subscription
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { priceId, trialDays } = body;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }

    // Get or create customer
    let customer = await getCustomerByUserId(session.user.id);
    if (!customer) {
      const { createOrUpdateCustomer } = await import('@/lib/payments/stripe-enhanced');
      customer = await createOrUpdateCustomer({
        email: session.user.email!,
        userId: session.user.id,
        name: session.user.name || undefined,
      });
    }

    // Create subscription
    const subscription = await createSubscription({
      customerId: customer.id,
      priceId,
      trialDays,
      metadata: {
        userId: session.user.id,
      },
    });

    // Save to database
    const subscriptionService = getSubscriptionService();
    await subscriptionService.createSubscription({
      userId: session.user.id,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customer.id,
      stripePriceId: priceId,
      status: subscription.status as any,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      status: subscription.status,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/payments/subscription
 * Update subscription (change plan, quantity, etc.)
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { priceId, quantity } = body;

    // Get current subscription
    const subscriptionService = getSubscriptionService();
    const currentSubscription = await subscriptionService.getSubscription(session.user.id);

    if (!currentSubscription?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Update subscription in Stripe
    const updatedSubscription = await updateSubscription({
      subscriptionId: currentSubscription.stripeSubscriptionId,
      priceId,
      quantity,
    });

    // Update database
    await subscriptionService.updateSubscription(session.user.id, {
      stripePriceId: priceId || currentSubscription.stripePriceId,
      status: updatedSubscription.status as any,
      currentPeriodStart: new Date(updatedSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        items: updatedSubscription.items.data,
      },
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/payments/subscription
 * Cancel subscription
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const immediately = searchParams.get('immediately') === 'true';

    // Get current subscription
    const subscriptionService = getSubscriptionService();
    const currentSubscription = await subscriptionService.getSubscription(session.user.id);

    if (!currentSubscription?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Cancel in Stripe
    const canceledSubscription = await cancelSubscription(
      currentSubscription.stripeSubscriptionId,
      immediately
    );

    // Update database
    await subscriptionService.updateSubscription(session.user.id, {
      status: immediately ? 'canceled' : 'active',
      cancelAtPeriodEnd: !immediately,
      canceledAt: immediately ? new Date() : undefined,
    });

    return NextResponse.json({
      success: true,
      message: immediately 
        ? 'Subscription canceled immediately' 
        : 'Subscription will be canceled at the end of the billing period',
      subscription: {
        id: canceledSubscription.id,
        status: canceledSubscription.status,
        cancel_at_period_end: canceledSubscription.cancel_at_period_end,
        canceled_at: canceledSubscription.canceled_at,
        current_period_end: canceledSubscription.current_period_end,
      },
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/payments/subscription/resume
 * Resume a canceled subscription
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current subscription
    const subscriptionService = getSubscriptionService();
    const currentSubscription = await subscriptionService.getSubscription(session.user.id);

    if (!currentSubscription?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    // Resume in Stripe
    const resumedSubscription = await resumeSubscription(
      currentSubscription.stripeSubscriptionId
    );

    // Update database
    await subscriptionService.updateSubscription(session.user.id, {
      status: 'active',
      cancelAtPeriodEnd: false,
      canceledAt: null,
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription resumed successfully',
      subscription: {
        id: resumedSubscription.id,
        status: resumedSubscription.status,
        cancel_at_period_end: resumedSubscription.cancel_at_period_end,
      },
    });
  } catch (error) {
    console.error('Error resuming subscription:', error);
    return NextResponse.json(
      { error: 'Failed to resume subscription' },
      { status: 500 }
    );
  }
}