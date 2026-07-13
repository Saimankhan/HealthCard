import "server-only";
import Stripe from "stripe";

import { serverEnv } from "@/core/config/env.server";

export const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY, {
  apiVersion: "2026-06-24.dahlia",
});
