import "server-only";
import type Stripe from "stripe";
import type { Session } from "@/core/auth/auth";
import { isAdminRole } from "@/core/auth/roles";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/core/api/errors";
import { paginationMeta, paginationSkipTake } from "@/core/api/pagination";
import { clientEnv } from "@/core/config/env.client";
import { getOrCreateStripeCustomer, stripe } from "@/core/payments/stripe";
import {
  paymentFailedEmail,
  paymentSuccessEmail,
  refundEmail,
} from "@/core/email/templates";
import { paymentConfirmationSms } from "@/core/sms/templates";
import { writeAuditLog } from "@/features/audit-logs/services/audit-log.service";
import { notifyUser } from "@/features/notifications/services/notification.service";
import * as paymentRepo from "@/features/payments/repository/payment.repository";
import * as patientRepo from "@/features/patients/repository/patient.repository";
import {
  findAppointmentById,
  updateAppointmentStatus,
} from "@/features/appointments/repository/appointment.repository";
import type {
  CreatePaymentInput,
  ListPaymentsQuery,
  RefundPaymentInput,
} from "@/features/payments/validation/payment.validation";
import type { PaymentStatus } from "@/generated/prisma/client";

type PaymentRecord = NonNullable<
  Awaited<ReturnType<typeof paymentRepo.findPaymentById>>
>;

function assertPaymentAccess(session: Session, payment: PaymentRecord) {
  if (
    !isAdminRole(session.user.role) &&
    !(
      session.user.role === "PATIENT" &&
      payment.patient.userId === session.user.id
    )
  ) {
    throw new ForbiddenError();
  }
}

async function confirmLinkedAppointmentIfPending(payment: PaymentRecord) {
  if (!payment.appointmentId) return;
  const appointment = await findAppointmentById(payment.appointmentId);
  if (appointment && appointment.status === "PENDING") {
    await updateAppointmentStatus(appointment.id, "CONFIRMED");
  }
}

async function notifyPaymentSucceeded(payment: PaymentRecord) {
  const amount = Number(payment.amount).toFixed(2);
  const { subject, html } = paymentSuccessEmail({
    patientName: payment.patient.user.name,
    amount,
    currency: payment.currency,
    receiptUrl: payment.receiptUrl,
  });

  await notifyUser({
    userId: payment.patient.userId,
    type: "PAYMENT_SUCCESS",
    title: "Payment received",
    message: `Your payment of ${amount} ${payment.currency.toUpperCase()} was successful.`,
    email: { to: payment.patient.user.email, subject, html },
    ...(payment.patient.phone
      ? {
          sms: {
            to: payment.patient.phone,
            body: paymentConfirmationSms({
              amount,
              currency: payment.currency,
            }),
          },
        }
      : {}),
  });
}

async function notifyPaymentFailed(payment: PaymentRecord) {
  const amount = Number(payment.amount).toFixed(2);
  const { subject, html } = paymentFailedEmail({
    patientName: payment.patient.user.name,
    amount,
    currency: payment.currency,
  });

  await notifyUser({
    userId: payment.patient.userId,
    type: "PAYMENT_FAILED",
    title: "Payment failed",
    message: `Your payment of ${amount} ${payment.currency.toUpperCase()} could not be processed.`,
    email: { to: payment.patient.user.email, subject, html },
  });
}

async function notifyPaymentRefunded(
  payment: PaymentRecord,
  refundAmount: number
) {
  const { subject, html } = refundEmail({
    patientName: payment.patient.user.name,
    amount: refundAmount.toFixed(2),
    currency: payment.currency,
  });

  await notifyUser({
    userId: payment.patient.userId,
    type: "PAYMENT_SUCCESS",
    title: "Refund processed",
    message: `A refund of ${refundAmount.toFixed(2)} ${payment.currency.toUpperCase()} has been issued.`,
    email: { to: payment.patient.user.email, subject, html },
  });
}

/** Idempotent: safe to call multiple times for the same payment/event. */
async function finalizePaymentSuccess(
  paymentId: string,
  details: { paymentIntentId?: string | null }
) {
  const payment = await paymentRepo.findPaymentById(paymentId);
  if (!payment || payment.status === "SUCCEEDED") return payment;

  let receiptUrl: string | null = null;
  if (details.paymentIntentId) {
    try {
      const intent = await stripe.paymentIntents.retrieve(
        details.paymentIntentId,
        { expand: ["latest_charge"] }
      );
      const charge = intent.latest_charge;
      if (charge && typeof charge !== "string") {
        receiptUrl = charge.receipt_url ?? null;
      }
    } catch (error) {
      console.error(
        `[payments] failed to fetch receipt for payment ${paymentId}`,
        error
      );
    }
  }

  const updated = await paymentRepo.markPaymentSucceeded(paymentId, {
    paymentIntentId: details.paymentIntentId,
    receiptUrl,
  });

  await confirmLinkedAppointmentIfPending(updated);
  await notifyPaymentSucceeded(updated);

  return updated;
}

export async function listPaymentsService(
  session: Session,
  query: ListPaymentsQuery
) {
  const { skip, take } = paginationSkipTake(query);

  let patientId = query.patientId;

  if (session.user.role === "PATIENT") {
    const patient = await patientRepo.findPatientByUserId(session.user.id);
    if (!patient) throw new NotFoundError("Patient profile");
    patientId = patient.id;
  } else if (!isAdminRole(session.user.role)) {
    throw new ForbiddenError();
  }

  const { items, total } = await paymentRepo.listPayments({
    skip,
    take,
    sortOrder: query.sortOrder,
    patientId,
    status: query.status,
    method: query.method,
  });

  return { items, meta: paginationMeta(query, total) };
}

export async function getPaymentByIdService(session: Session, id: string) {
  const payment = await paymentRepo.findPaymentById(id);
  if (!payment) throw new NotFoundError("Payment");
  assertPaymentAccess(session, payment);
  return payment;
}

export async function createPaymentService(
  actorId: string,
  input: CreatePaymentInput
) {
  const patient = await patientRepo.findPatientById(input.patientId);
  if (!patient) throw new NotFoundError("Patient");

  const payment = await paymentRepo.createPayment({
    patient: { connect: { id: input.patientId } },
    ...(input.appointmentId
      ? { appointment: { connect: { id: input.appointmentId } } }
      : {}),
    amount: input.amount,
    currency: input.currency,
    method: input.method,
  });

  await writeAuditLog({
    actorId,
    action: "CREATE",
    entityType: "Payment",
    entityId: payment.id,
  });

  return payment;
}

export async function updatePaymentStatusService(
  actorId: string,
  id: string,
  status: PaymentStatus
) {
  const payment = await paymentRepo.findPaymentById(id);
  if (!payment) throw new NotFoundError("Payment");

  const updated = await paymentRepo.updatePaymentStatus(id, status);

  if (status === "SUCCEEDED") {
    await confirmLinkedAppointmentIfPending(updated);
    await notifyPaymentSucceeded(updated);
  } else if (status === "FAILED") {
    await notifyPaymentFailed(updated);
  }

  await writeAuditLog({
    actorId,
    action: "STATUS_CHANGE",
    entityType: "Payment",
    entityId: id,
    metadata: { status },
  });

  return updated;
}

const CHECKOUT_RATE_LIMIT = { limit: 10, windowSeconds: 60 };

export async function createCheckoutSessionService(
  session: Session,
  paymentId: string
) {
  const payment = await paymentRepo.findPaymentById(paymentId);
  if (!payment) throw new NotFoundError("Payment");
  assertPaymentAccess(session, payment);

  if (payment.status !== "PENDING") {
    throw new ConflictError("Only pending payments can be paid");
  }

  const { checkRateLimit } = await import("@/core/security/rate-limit");
  const allowed = await checkRateLimit(
    `checkout:${session.user.id}`,
    CHECKOUT_RATE_LIMIT.limit,
    CHECKOUT_RATE_LIMIT.windowSeconds
  );
  if (!allowed) {
    throw new ConflictError(
      "Too many checkout attempts. Please wait a moment."
    );
  }

  const customerId = await getOrCreateStripeCustomer({
    id: payment.patient.id,
    stripeCustomerId: payment.patient.stripeCustomerId,
    user: payment.patient.user,
  });

  const appUrl = clientEnv.NEXT_PUBLIC_APP_URL;
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: payment.currency,
          product_data: { name: "HealthCard consultation payment" },
          unit_amount: Math.round(Number(payment.amount) * 100),
        },
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/patient/payments/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/patient/payments/cancel?paymentId=${payment.id}`,
    metadata: { paymentId: payment.id },
  });

  if (!checkoutSession.url) {
    throw new ConflictError("Stripe did not return a checkout URL");
  }

  await paymentRepo.setCheckoutSessionId(payment.id, checkoutSession.id);

  return { url: checkoutSession.url };
}

export async function verifyPaymentService(
  session: Session,
  sessionId: string
) {
  const payment = await paymentRepo.findPaymentByCheckoutSessionId(sessionId);
  if (!payment) throw new NotFoundError("Payment");
  assertPaymentAccess(session, payment);

  if (payment.status === "PENDING") {
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
    if (checkoutSession.payment_status === "paid") {
      const updated = await finalizePaymentSuccess(payment.id, {
        paymentIntentId:
          typeof checkoutSession.payment_intent === "string"
            ? checkoutSession.payment_intent
            : (checkoutSession.payment_intent?.id ?? null),
      });
      return updated ?? payment;
    }
  }

  return payment;
}

export async function refundPaymentService(
  actorId: string,
  id: string,
  input: RefundPaymentInput
) {
  const payment = await paymentRepo.findPaymentById(id);
  if (!payment) throw new NotFoundError("Payment");

  if (
    payment.status !== "SUCCEEDED" &&
    payment.status !== "PARTIALLY_REFUNDED"
  ) {
    throw new ConflictError("Only succeeded payments can be refunded");
  }

  const refundAmount = input.amount ?? Number(payment.amount);
  if (refundAmount > Number(payment.amount)) {
    throw new BadRequestError("Refund amount cannot exceed the payment amount");
  }

  if (payment.stripePaymentIntentId) {
    await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: Math.round(refundAmount * 100),
    });
  }

  const isFullRefund = refundAmount >= Number(payment.amount);
  const updated = await paymentRepo.applyRefund(
    id,
    isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
    refundAmount.toFixed(2)
  );

  await notifyPaymentRefunded(updated, refundAmount);

  await writeAuditLog({
    actorId,
    action: "STATUS_CHANGE",
    entityType: "Payment",
    entityId: id,
    metadata: { refundAmount },
  });

  return updated;
}

// ---------------------------------------------------------------------
// Stripe webhook business logic — called from app/api/webhooks/stripe only.
// Each handler re-derives the payment from Stripe identifiers and is a
// no-op if the payment is already in the target state, so replayed/
// out-of-order webhook deliveries are safe.
// ---------------------------------------------------------------------

export async function handleCheckoutSessionCompletedWebhook(
  session: Stripe.Checkout.Session
) {
  const paymentId = session.metadata?.paymentId;
  const payment = paymentId
    ? await paymentRepo.findPaymentById(paymentId)
    : await paymentRepo.findPaymentByCheckoutSessionId(session.id);
  if (!payment) return;

  await finalizePaymentSuccess(payment.id, {
    paymentIntentId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent?.id ?? null),
  });
}

export async function handlePaymentIntentFailedWebhook(
  paymentIntent: Stripe.PaymentIntent
) {
  const payment = await paymentRepo.findPaymentByPaymentIntentId(
    paymentIntent.id
  );
  if (!payment || payment.status !== "PENDING") return;

  const updated = await paymentRepo.updatePaymentStatus(payment.id, "FAILED");
  await notifyPaymentFailed(updated);
}

export async function handleChargeRefundedWebhook(charge: Stripe.Charge) {
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;
  if (!paymentIntentId) return;

  const payment =
    await paymentRepo.findPaymentByPaymentIntentId(paymentIntentId);
  if (!payment) return;
  if (
    payment.status === "REFUNDED" ||
    payment.status === "PARTIALLY_REFUNDED"
  ) {
    return;
  }

  const refundedAmount = charge.amount_refunded / 100;
  if (refundedAmount <= 0) return;

  const isFullRefund = refundedAmount >= Number(payment.amount);
  const updated = await paymentRepo.applyRefund(
    payment.id,
    isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
    refundedAmount.toFixed(2)
  );

  await notifyPaymentRefunded(updated, refundedAmount);
}
