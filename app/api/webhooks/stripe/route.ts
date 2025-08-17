import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyWebhookSignature, handleWebhookEvent } from '@/lib/payments/stripe-enhanced';
import { getSubscriptionService } from '@/services/subscription/subscription.factory';
import { getUserService } from '@/services/user/user.factory';

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = headers().get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  try {
    // Verify the webhook signature
    const event = verifyWebhookSignature({
      payload: body,
      signature,
      secret: webhookSecret,
    });

    // Log the event for monitoring
    console.log(`Webhook received: ${event.type}`, {
      id: event.id,
      type: event.type,
      created: new Date(event.created * 1000),
    });

    // Get services
    const subscriptionService = getSubscriptionService();
    const userService = getUserService();

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        
        // Extract customer metadata
        const userId = subscription.metadata?.userId;
        if (!userId) {
          console.warn('No userId in subscription metadata', subscription.id);
          break;
        }

        // Update subscription in database
        await subscriptionService.updateSubscription(userId, {
          stripeSubscriptionId: subscription.id,
          stripePriceId: subscription.items.data[0]?.price.id,
          stripeCustomerId: subscription.customer,
          status: subscription.status === 'active' ? 'active' : 
                  subscription.status === 'trialing' ? 'trialing' :
                  subscription.status === 'canceled' ? 'canceled' :
                  subscription.status === 'past_due' ? 'past_due' : 'inactive',
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        });

        console.log(`Subscription ${event.type}: ${subscription.id} for user ${userId}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const userId = subscription.metadata?.userId;
        
        if (!userId) {
          console.warn('No userId in subscription metadata', subscription.id);
          break;
        }

        // Update subscription status to canceled
        await subscriptionService.updateSubscription(userId, {
          status: 'canceled',
          canceledAt: new Date(),
        });

        console.log(`Subscription deleted: ${subscription.id} for user ${userId}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        
        // Update payment record
        if (invoice.subscription && invoice.metadata?.userId) {
          await subscriptionService.recordPayment({
            userId: invoice.metadata.userId,
            subscriptionId: invoice.subscription,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            invoiceId: invoice.id,
            paidAt: new Date(invoice.status_transitions.paid_at * 1000),
          });
        }

        console.log(`Payment succeeded for invoice: ${invoice.id}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        
        // Handle failed payment
        if (invoice.subscription && invoice.metadata?.userId) {
          // Update subscription status
          await subscriptionService.updateSubscription(invoice.metadata.userId, {
            status: 'past_due',
          });

          // TODO: Send email notification about failed payment
          console.warn(`Payment failed for invoice: ${invoice.id}`);
        }
        break;
      }

      case 'customer.created':
      case 'customer.updated': {
        const customer = event.data.object as any;
        const userId = customer.metadata?.userId;
        
        if (!userId) {
          console.warn('No userId in customer metadata', customer.id);
          break;
        }

        // Update user's Stripe customer ID
        await userService.updateUser(userId, {
          stripeCustomerId: customer.id,
        });

        console.log(`Customer ${event.type}: ${customer.id} for user ${userId}`);
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object as any;
        
        // Handle successful checkout
        if (session.mode === 'subscription' && session.metadata?.userId) {
          const userId = session.metadata.userId;
          const subscriptionId = session.subscription;
          
          // Link subscription to user
          await subscriptionService.updateSubscription(userId, {
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: session.customer,
            status: 'active',
          });

          console.log(`Checkout completed for user ${userId}, subscription ${subscriptionId}`);
        }
        break;
      }

      case 'payment_method.attached': {
        const paymentMethod = event.data.object as any;
        
        // Log payment method attachment
        console.log(`Payment method attached: ${paymentMethod.id} to customer ${paymentMethod.customer}`);
        break;
      }

      case 'payment_method.detached': {
        const paymentMethod = event.data.object as any;
        
        // Log payment method detachment
        console.log(`Payment method detached: ${paymentMethod.id}`);
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }

    // Use the built-in handler for additional processing
    await handleWebhookEvent(event);

    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Webhook error:', error.message);
      
      // Return 400 for signature verification errors
      if (error.message.includes('signature')) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 400 }
        );
      }
    }
    
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Stripe webhooks require raw body for signature verification
export const runtime = 'nodejs';