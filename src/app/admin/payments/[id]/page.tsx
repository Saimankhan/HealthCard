import type { Metadata } from "next";

import { AdminPaymentDetail } from "@/components/admin/payments/payment-detail";

export const metadata: Metadata = { title: "Payment - HealthCard Admin" };

export default async function AdminPaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminPaymentDetail id={id} />;
}
