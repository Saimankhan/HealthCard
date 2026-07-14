import "server-only";
import { randomInt } from "node:crypto";

import { redis } from "@/core/cache/redis";
import { sendSms } from "@/core/sms/twilio";

const OTP_TTL_SECONDS = 5 * 60;

function otpKey(phone: string): string {
  return `otp:${phone}`;
}

/**
 * Not wired into any auth flow yet — kept ready for a future phone-based
 * login/verification step without needing to touch the SMS transport again.
 */
export async function sendOtpSms(phone: string): Promise<void> {
  const code = randomInt(100000, 999999).toString();
  await redis.set(otpKey(phone), code, { ex: OTP_TTL_SECONDS });
  await sendSms(
    phone,
    `Your HealthCard verification code is ${code}. It expires in 5 minutes.`
  );
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const stored = await redis.get<string>(otpKey(phone));
  if (!stored || stored !== code) return false;
  await redis.del(otpKey(phone));
  return true;
}
