import { NextRequest, NextResponse } from 'next/server';
import { createCustomerPortalSession, getCustomerByUserId, createOrUpdateCustomer } from '@/lib/payments/stripe-enhanced';
import { getServerSession } from '@/lib/auth';

/**
 * POST /api/payments/portal
 * Create a Stripe Customer Portal session for the authenticated user
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

    // Get return URL from request body
    const body = await request.json();
    const returnUrl = body.returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/settings/subscription`;

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

    // Create portal session
    const portalSession = await createCustomerPortalSession({
      customerId: customer.id,
      returnUrl,
    });

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}