import { loadStripe, type Stripe } from "@stripe/stripe-js";

import { clientEnv } from "@/core/config/env.client";

let stripePromise: Promise<Stripe | null> | undefined;

export function getStripeClient(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(clientEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
}
