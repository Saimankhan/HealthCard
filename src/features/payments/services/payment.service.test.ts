import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/core/payments/stripe", () => ({
  stripe: {
    refunds: { create: vi.fn() },
    checkout: { sessions: { create: vi.fn(), retrieve: vi.fn() } },
    paymentIntents: { retrieve: vi.fn() },
  },
  getOrCreateStripeCustomer: vi.fn().mockResolvedValue("cus_123"),
}));
vi.mock("@/core/security/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/core/email/templates", () => ({
  paymentFailedEmail: vi.fn(() => ({ subject: "", html: "" })),
  paymentSuccessEmail: vi.fn(() => ({ subject: "", html: "" })),
  refundEmail: vi.fn(() => ({ subject: "", html: "" })),
}));
vi.mock("@/core/sms/templates", () => ({
  paymentConfirmationSms: vi.fn(() => ""),
}));
vi.mock("@/features/audit-logs/services/audit-log.service", () => ({
  writeAuditLog: vi.fn(),
}));
vi.mock("@/features/notifications/services/notification.service", () => ({
  notifyUser: vi.fn(),
}));
vi.mock("@/features/payments/repository/payment.repository");
vi.mock("@/features/patients/repository/patient.repository");
vi.mock("@/features/appointments/repository/appointment.repository", () => ({
  findAppointmentById: vi.fn(),
  updateAppointmentStatus: vi.fn(),
}));

import { stripe } from "@/core/payments/stripe";
import { checkRateLimit } from "@/core/security/rate-limit";
import { notifyUser } from "@/features/notifications/services/notification.service";
import * as paymentRepo from "@/features/payments/repository/payment.repository";
import {
  createCheckoutSessionService,
  getPaymentByIdService,
  refundPaymentService,
  updatePaymentStatusService,
} from "@/features/payments/services/payment.service";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
} from "@/core/api/errors";
import type { Session } from "@/core/auth/auth";

function makeSession(role: string, userId = "user-1"): Session {
  return { user: { id: userId, role } } as unknown as Session;
}

function makePayment(overrides: Record<string, unknown> = {}) {
  return {
    id: "payment-1",
    patientId: "patient-1",
    appointmentId: null,
    amount: "100.00",
    currency: "usd",
    status: "SUCCEEDED",
    method: "CARD",
    stripePaymentIntentId: null,
    stripeCheckoutSessionId: null,
    receiptUrl: null,
    refundedAmount: null,
    patient: {
      id: "patient-1",
      userId: "patient-user-1",
      phone: null,
      stripeCustomerId: null,
      user: { name: "Pat", email: "p@e.com" },
    },
    ...overrides,
  } as unknown as NonNullable<
    Awaited<ReturnType<typeof paymentRepo.findPaymentById>>
  >;
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("getPaymentByIdService", () => {
  it("allows an admin to view any payment", async () => {
    vi.mocked(paymentRepo.findPaymentById).mockResolvedValue(makePayment());
    const payment = await getPaymentByIdService(
      makeSession("ADMIN"),
      "payment-1"
    );
    expect(payment.id).toBe("payment-1");
  });

  it("allows a patient to view their own payment", async () => {
    vi.mocked(paymentRepo.findPaymentById).mockResolvedValue(makePayment());
    const payment = await getPaymentByIdService(
      makeSession("PATIENT", "patient-user-1"),
      "payment-1"
    );
    expect(payment.id).toBe("payment-1");
  });

  it("blocks a patient from viewing someone else's payment", async () => {
    vi.mocked(paymentRepo.findPaymentById).mockResolvedValue(makePayment());
    await expect(
      getPaymentByIdService(makeSession("PATIENT", "someone-else"), "payment-1")
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("refundPaymentService", () => {
  it("rejects refunding a payment that was never succeeded", async () => {
    vi.mocked(paymentRepo.findPaymentById).mockResolvedValue(
      makePayment({ status: "PENDING" })
    );
    await expect(
      refundPaymentService("actor-1", "payment-1", {})
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects a refund amount larger than the payment", async () => {
    vi.mocked(paymentRepo.findPaymentById).mockResolvedValue(makePayment());
    await expect(
      refundPaymentService("actor-1", "payment-1", { amount: 500 })
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("applies a full refund and skips Stripe when there's no payment intent", async () => {
    vi.mocked(paymentRepo.findPaymentById).mockResolvedValue(makePayment());
    vi.mocked(paymentRepo.applyRefund).mockResolvedValue(
      makePayment({ status: "REFUNDED" })
    );

    const updated = await refundPaymentService("actor-1", "payment-1", {});

    expect(updated.status).toBe("REFUNDED");
    expect(stripe.refunds.create).not.toHaveBeenCalled();
    expect(paymentRepo.applyRefund).toHaveBeenCalledWith(
      "payment-1",
      "REFUNDED",
      "100.00"
    );
    expect(notifyUser).toHaveBeenCalled();
  });

  it("applies a partial refund when amount is less than the full payment", async () => {
    vi.mocked(paymentRepo.findPaymentById).mockResolvedValue(makePayment());
    vi.mocked(paymentRepo.applyRefund).mockResolvedValue(
      makePayment({ status: "PARTIALLY_REFUNDED" })
    );

    await refundPaymentService("actor-1", "payment-1", { amount: 40 });

    expect(paymentRepo.applyRefund).toHaveBeenCalledWith(
      "payment-1",
      "PARTIALLY_REFUNDED",
      "40.00"
    );
  });
});

describe("createCheckoutSessionService", () => {
  it("rejects checkout for a non-pending payment", async () => {
    vi.mocked(paymentRepo.findPaymentById).mockResolvedValue(
      makePayment({ status: "SUCCEEDED" })
    );
    await expect(
      createCheckoutSessionService(
        makeSession("PATIENT", "patient-user-1"),
        "payment-1"
      )
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects checkout when the rate limit is exceeded", async () => {
    vi.mocked(paymentRepo.findPaymentById).mockResolvedValue(
      makePayment({ status: "PENDING" })
    );
    vi.mocked(checkRateLimit).mockResolvedValue(false);

    await expect(
      createCheckoutSessionService(
        makeSession("PATIENT", "patient-user-1"),
        "payment-1"
      )
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("updatePaymentStatusService", () => {
  it("notifies the patient when a payment succeeds", async () => {
    vi.mocked(paymentRepo.findPaymentById).mockResolvedValue(
      makePayment({ status: "PENDING" })
    );
    vi.mocked(paymentRepo.updatePaymentStatus).mockResolvedValue(
      makePayment({ status: "SUCCEEDED" })
    );

    await updatePaymentStatusService("actor-1", "payment-1", "SUCCEEDED");

    expect(notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({ type: "PAYMENT_SUCCESS" })
    );
  });
});
