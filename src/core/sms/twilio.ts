import "server-only";
import Twilio from "twilio";

import { serverEnv } from "@/core/config/env.server";

const isConfigured = Boolean(
  serverEnv.TWILIO_ACCOUNT_SID &&
  serverEnv.TWILIO_AUTH_TOKEN &&
  serverEnv.TWILIO_FROM_NUMBER
);

const client = isConfigured
  ? Twilio(serverEnv.TWILIO_ACCOUNT_SID!, serverEnv.TWILIO_AUTH_TOKEN!)
  : null;

/**
 * Best-effort SMS send. Twilio is optional infrastructure — if it isn't
 * configured (e.g. local dev, or a deployment that doesn't need SMS), this
 * no-ops instead of throwing so the rest of a request can still succeed.
 */
export async function sendSms(to: string, body: string): Promise<boolean> {
  if (!client) {
    console.warn("[sms] Twilio is not configured; skipping SMS send");
    return false;
  }

  await client.messages.create({
    to,
    from: serverEnv.TWILIO_FROM_NUMBER!,
    body,
  });
  return true;
}
