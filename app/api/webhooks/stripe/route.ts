import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/payments/stripe";
import { getApiSubscriptionService } from "@/services/subscription/factory";
import { checkRateLimit } from '@/middleware/rate-limit';
import { logUserAction } from '@/lib/audit/auditLogger';
import { ApiError, ERROR_CODES } from '@/lib/api/common';
import type Stripe from "stripe";

/**
 * Stripe Webhook handler
 *
 * Verifies the event signature and updates subscriptions accordingly.
 */
export async function POST(request: NextRequest) {
  const isRateLimited = await checkRateLimit(request);
  if (isRateLimited) {
    const err = new ApiError(ERROR_CODES.INVALID_REQUEST, 'Too many requests', 429);
    return NextResponse.json(err.toResponse(), { status: err.status });
  }

  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    const err = new ApiError(ERROR_CODES.INTERNAL_ERROR, 'Server configuration error', 500);
    return NextResponse.json(err.toResponse(), { status: err.status });
  }

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      payload,
      signature || "",
      webhookSecret,
    );
  } catch (err: any) {
    console.error("Stripe signature verification failed:", err);
    const apiErr = new ApiError(ERROR_CODES.INVALID_REQUEST, 'Invalid signature', 400);
    await logUserAction({
      action: 'STRIPE_WEBHOOK_INVALID',
      status: 'FAILURE',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: { error: err.message },
    });
    return NextResponse.json(apiErr.toResponse(), { status: apiErr.status });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;
        if (userId) {
          const service = getApiSubscriptionService();
          if (service) {
            await service.reconcileSubscription({
              id: subscription.id,
              userId,
              planId: subscription.items.data[0]?.price.id ?? "",
              status: subscription.status,
              startDate: new Date(subscription.start_date * 1000).toISOString(),
              endDate: subscription.ended_at
                ? new Date(subscription.ended_at * 1000).toISOString()
                : null,
              renewalDate: new Date(
                subscription.current_period_end * 1000,
              ).toISOString(),
              canceledAt: subscription.canceled_at
                ? new Date(subscription.canceled_at * 1000).toISOString()
                : null,
              paymentMethod: undefined,
              metadata: subscription.metadata as any,
            });
          }
        }
        await logUserAction({
          userId,
          action: `STRIPE_${event.type.toUpperCase()}`,
          status: 'SUCCESS',
          targetResourceType: 'subscription',
          targetResourceId: subscription.id,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        });
        break;
      }
      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }
  } catch (err) {
    console.error("Error processing Stripe webhook:", err);
    await logUserAction({
      action: 'STRIPE_WEBHOOK_PROCESSING_ERROR',
      status: 'FAILURE',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: { error: (err as Error).message },
    });
    const apiErr = new ApiError(ERROR_CODES.INTERNAL_ERROR, 'Internal server error', 500);
    return NextResponse.json(apiErr.toResponse(), { status: apiErr.status });
  }

  return NextResponse.json({ received: true });
}
