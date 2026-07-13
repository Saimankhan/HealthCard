import "server-only";
import type { Session } from "@/core/auth/auth";
import { isAdminRole } from "@/core/auth/roles";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/core/api/errors";
import { paginationMeta, paginationSkipTake } from "@/core/api/pagination";
import { stripe } from "@/core/payments/stripe";
import { writeAuditLog } from "@/features/audit-logs/services/audit-log.service";
import { createNotification } from "@/features/notifications/repository/notification.repository";
import * as paymentRepo from "@/features/payments/repository/payment.repository";
import * as patientRepo from "@/features/patients/repository/patient.repository";
import type {
  CreatePaymentInput,
  ListPaymentsQuery,
  RefundPaymentInput,
} from "@/features/payments/validation/payment.validation";
import type { PaymentStatus } from "@/generated/prisma/client";

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

  if (
    !isAdminRole(session.user.role) &&
    !(
      session.user.role === "PATIENT" &&
      payment.patient.userId === session.user.id
    )
  ) {
    throw new ForbiddenError();
  }

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
    await createNotification({
      userId: updated.patient.userId,
      type: "PAYMENT_SUCCESS",
      title: "Payment received",
      message: `Your payment of ${updated.amount} ${updated.currency.toUpperCase()} was successful.`,
    });
  } else if (status === "FAILED") {
    await createNotification({
      userId: updated.patient.userId,
      type: "PAYMENT_FAILED",
      title: "Payment failed",
      message: `Your payment of ${updated.amount} ${updated.currency.toUpperCase()} could not be processed.`,
    });
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

  await createNotification({
    userId: updated.patient.userId,
    type: "PAYMENT_SUCCESS",
    title: "Refund processed",
    message: `A refund of ${refundAmount.toFixed(2)} ${updated.currency.toUpperCase()} has been issued.`,
  });

  await writeAuditLog({
    actorId,
    action: "STATUS_CHANGE",
    entityType: "Payment",
    entityId: id,
    metadata: { refundAmount },
  });

  return updated;
}
