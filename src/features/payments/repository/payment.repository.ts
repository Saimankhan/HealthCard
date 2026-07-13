import "server-only";
import { prisma } from "@/core/db/prisma";
import type {
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from "@/generated/prisma/client";

const paymentInclude = {
  patient: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
} as const;

export async function findPaymentById(id: string) {
  return prisma.payment.findUnique({
    where: { id },
    include: paymentInclude,
  });
}

export async function listPayments(params: {
  skip: number;
  take: number;
  sortOrder: "asc" | "desc";
  patientId?: string;
  status?: PaymentStatus;
  method?: PaymentMethod;
}) {
  const where: Prisma.PaymentWhereInput = {
    ...(params.patientId ? { patientId: params.patientId } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.method ? { method: params.method } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: params.sortOrder },
      include: paymentInclude,
    }),
    prisma.payment.count({ where }),
  ]);

  return { items, total };
}

export async function createPayment(data: Prisma.PaymentCreateInput) {
  return prisma.payment.create({ data, include: paymentInclude });
}

export async function updatePaymentStatus(id: string, status: PaymentStatus) {
  return prisma.payment.update({
    where: { id },
    data: { status },
    include: paymentInclude,
  });
}

export async function applyRefund(
  id: string,
  status: PaymentStatus,
  refundedAmount: string
) {
  return prisma.payment.update({
    where: { id },
    data: { status, refundedAmount },
    include: paymentInclude,
  });
}
