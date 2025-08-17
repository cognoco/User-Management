import { NextRequest, NextResponse } from 'next/server';
import { 
  getCustomerByUserId,
  getPaymentMethods,
  attachPaymentMethod,
  setDefaultPaymentMethod,
  detachPaymentMethod,
  createSetupIntent,
  createOrUpdateCustomer
} from '@/lib/payments/stripe-enhanced';
import { getServerSession } from '@/lib/auth';

/**
 * GET /api/payments/methods
 * Get payment methods for authenticated user
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

    // Get customer
    const customer = await getCustomerByUserId(session.user.id);
    
    if (!customer) {
      return NextResponse.json({
        payment_methods: [],
        default_payment_method: null,
      });
    }

    // Get payment methods
    const paymentMethods = await getPaymentMethods(customer.id);

    // Get default payment method
    const defaultPaymentMethodId = typeof customer.invoice_settings?.default_payment_method === 'string' 
      ? customer.invoice_settings.default_payment_method 
      : null;

    return NextResponse.json({
      payment_methods: paymentMethods.map(pm => ({
        id: pm.id,
        type: pm.type,
        card: pm.card ? {
          brand: pm.card.brand,
          last4: pm.card.last4,
          exp_month: pm.card.exp_month,
          exp_year: pm.card.exp_year,
        } : null,
        created: pm.created,
        is_default: pm.id === defaultPaymentMethodId,
      })),
      default_payment_method: defaultPaymentMethodId,
    });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payments/methods
 * Add a new payment method
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
    const { paymentMethodId, setAsDefault = false } = body;

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    // Get or create customer
    let customer = await getCustomerByUserId(session.user.id);
    
    if (!customer) {
      customer = await createOrUpdateCustomer({
        email: session.user.email!,
        userId: session.user.id,
        name: session.user.name || undefined,
      });
    }

    // Attach payment method to customer
    const paymentMethod = await attachPaymentMethod({
      paymentMethodId,
      customerId: customer.id,
    });

    // Set as default if requested
    if (setAsDefault) {
      await setDefaultPaymentMethod({
        customerId: customer.id,
        paymentMethodId: paymentMethod.id,
      });
    }

    return NextResponse.json({
      success: true,
      payment_method: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          exp_month: paymentMethod.card.exp_month,
          exp_year: paymentMethod.card.exp_year,
        } : null,
      },
    });
  } catch (error) {
    console.error('Error adding payment method:', error);
    return NextResponse.json(
      { error: 'Failed to add payment method' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/payments/methods/[id]
 * Remove a payment method
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
    const paymentMethodId = searchParams.get('id');

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    // Verify customer owns this payment method
    const customer = await getCustomerByUserId(session.user.id);
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    const paymentMethods = await getPaymentMethods(customer.id);
    const paymentMethod = paymentMethods.find(pm => pm.id === paymentMethodId);

    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method not found' },
        { status: 404 }
      );
    }

    // Detach payment method
    await detachPaymentMethod(paymentMethodId);

    return NextResponse.json({
      success: true,
      message: 'Payment method removed successfully',
    });
  } catch (error) {
    console.error('Error removing payment method:', error);
    return NextResponse.json(
      { error: 'Failed to remove payment method' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/payments/methods/default
 * Set default payment method
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
    const { paymentMethodId } = body;

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    // Get customer
    const customer = await getCustomerByUserId(session.user.id);
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Verify customer owns this payment method
    const paymentMethods = await getPaymentMethods(customer.id);
    const paymentMethod = paymentMethods.find(pm => pm.id === paymentMethodId);

    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method not found' },
        { status: 404 }
      );
    }

    // Set as default
    await setDefaultPaymentMethod({
      customerId: customer.id,
      paymentMethodId,
    });

    return NextResponse.json({
      success: true,
      message: 'Default payment method updated',
    });
  } catch (error) {
    console.error('Error setting default payment method:', error);
    return NextResponse.json(
      { error: 'Failed to set default payment method' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments/methods/setup-intent
 * Create a setup intent for adding a payment method without immediate payment
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

    // Get or create customer
    let customer = await getCustomerByUserId(session.user.id);
    
    if (!customer) {
      customer = await createOrUpdateCustomer({
        email: session.user.email!,
        userId: session.user.id,
        name: session.user.name || undefined,
      });
    }

    // Create setup intent
    const setupIntent = await createSetupIntent(customer.id);

    return NextResponse.json({
      client_secret: setupIntent.client_secret,
      setup_intent_id: setupIntent.id,
    });
  } catch (error) {
    console.error('Error creating setup intent:', error);
    return NextResponse.json(
      { error: 'Failed to create setup intent' },
      { status: 500 }
    );
  }
}