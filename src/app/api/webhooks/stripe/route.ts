import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import { stripe } from "@/core/payments/stripe";
import { serverEnv } from "@/core/config/env.server";
import {
  handleChargeRefundedWebhook,
  handleCheckoutSessionCompletedWebhook,
  handlePaymentIntentFailedWebhook,
} from "@/features/payments/services/payment.service";

export async function POST(request: NextRequest) {
  if (!serverEnv.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Stripe webhook secret is not configured" },
      { status: 501 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const payload = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      serverEnv.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    return NextResponse.json(
      { error: `Invalid signature: ${(error as Error).message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompletedWebhook(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "payment_intent.succeeded":
        // No-op: Checkout Sessions in "payment" mode always emit
        // checkout.session.completed too, and finalizePaymentSuccess is
        // idempotent — that event is the authoritative one we act on since
        // it carries our paymentId in metadata.
        break;
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailedWebhook(
          event.data.object as Stripe.PaymentIntent
        );
        break;
      case "charge.refunded":
        await handleChargeRefundedWebhook(event.data.object as Stripe.Charge);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error(`[webhooks/stripe] failed to process ${event.type}`, error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
