import type {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from "@/generated/prisma/client";

export type PaymentDto = Payment;
export type { PaymentMethod, PaymentStatus };
