import "server-only";
import Stripe from "stripe";

import { serverEnv } from "@/core/config/env.server";
import { updatePatient } from "@/features/patients/repository/patient.repository";

export const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY, {
  apiVersion: "2026-06-24.dahlia",
});

/**
 * Stripe Customers are created lazily on first checkout rather than at
 * registration, and the id is cached on Patient so repeat payments (and any
 * future subscription billing) reuse the same customer.
 */
export async function getOrCreateStripeCustomer(patient: {
  id: string;
  stripeCustomerId: string | null;
  user: { email: string; name: string };
}): Promise<string> {
  if (patient.stripeCustomerId) return patient.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: patient.user.email,
    name: patient.user.name,
    metadata: { patientId: patient.id },
  });

  await updatePatient(patient.id, { stripeCustomerId: customer.id });

  return customer.id;
}
