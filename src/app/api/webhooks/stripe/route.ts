import { NextResponse, type NextRequest } from "next/server";

import { stripe } from "@/core/payments/stripe";
import { serverEnv } from "@/core/config/env.server";

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

  switch (event.type) {
    case "checkout.session.completed":
    case "payment_intent.succeeded":
    case "payment_intent.payment_failed":
    case "charge.refunded":
      // Business-logic handlers (updating Payment records, sending
      // notifications, etc.) are wired up in the Payments feature phase.
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
