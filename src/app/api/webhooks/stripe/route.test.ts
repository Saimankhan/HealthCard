import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/core/payments/stripe", () => ({
  stripe: { webhooks: { constructEvent: vi.fn() } },
}));
vi.mock("@/core/config/env.server", () => ({
  serverEnv: { STRIPE_WEBHOOK_SECRET: "whsec_test" },
}));
vi.mock("@/features/payments/services/payment.service", () => ({
  handleCheckoutSessionCompletedWebhook: vi.fn(),
  handlePaymentIntentFailedWebhook: vi.fn(),
  handleChargeRefundedWebhook: vi.fn(),
}));

import { stripe } from "@/core/payments/stripe";
import {
  handleCheckoutSessionCompletedWebhook,
  handleChargeRefundedWebhook,
} from "@/features/payments/services/payment.service";
import { POST } from "@/app/api/webhooks/stripe/route";

function makeRequest(body: string, signature?: string) {
  return new NextRequest("http://localhost/api/webhooks/stripe", {
    method: "POST",
    body,
    headers: signature ? { "stripe-signature": signature } : undefined,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/webhooks/stripe", () => {
  it("returns 400 when the stripe-signature header is missing", async () => {
    const response = await POST(makeRequest("{}"));
    expect(response.status).toBe(400);
  });

  it("returns 400 when signature verification fails", async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
      throw new Error("bad signature");
    });

    const response = await POST(makeRequest("{}", "sig_bad"));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Invalid signature");
  });

  it("routes checkout.session.completed to its handler and returns 200", async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { id: "cs_1" } },
    } as never);

    const response = await POST(makeRequest("{}", "sig_ok"));

    expect(response.status).toBe(200);
    expect(handleCheckoutSessionCompletedWebhook).toHaveBeenCalledTimes(1);
  });

  it("no-ops on payment_intent.succeeded (checkout.session.completed is authoritative)", async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_1" } },
    } as never);

    const response = await POST(makeRequest("{}", "sig_ok"));

    expect(response.status).toBe(200);
    expect(handleCheckoutSessionCompletedWebhook).not.toHaveBeenCalled();
  });

  it("returns 500 when a handler throws", async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      type: "charge.refunded",
      data: { object: { id: "ch_1" } },
    } as never);
    vi.mocked(handleChargeRefundedWebhook).mockRejectedValue(
      new Error("db down")
    );

    const response = await POST(makeRequest("{}", "sig_ok"));
    expect(response.status).toBe(500);
  });
});

describe("POST /api/webhooks/stripe — missing webhook secret", () => {
  it("returns 501 when STRIPE_WEBHOOK_SECRET isn't configured", async () => {
    vi.resetModules();
    vi.doMock("@/core/config/env.server", () => ({
      serverEnv: { STRIPE_WEBHOOK_SECRET: undefined },
    }));
    vi.doMock("@/core/payments/stripe", () => ({
      stripe: { webhooks: { constructEvent: vi.fn() } },
    }));
    vi.doMock("@/features/payments/services/payment.service", () => ({
      handleCheckoutSessionCompletedWebhook: vi.fn(),
      handlePaymentIntentFailedWebhook: vi.fn(),
      handleChargeRefundedWebhook: vi.fn(),
    }));

    const { POST: PostWithoutSecret } =
      await import("@/app/api/webhooks/stripe/route");
    const response = await PostWithoutSecret(makeRequest("{}"));
    expect(response.status).toBe(501);
  });
});
