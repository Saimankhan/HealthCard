import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { getCurrentSession } from "@/core/auth/rbac";
import { getPaymentByIdService } from "@/features/payments/services/payment.service";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/patient/status-badge";
import { formatCurrency, formatDateTime, formatEnumLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Payment - HealthCard" };

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) return null;

  const { id } = await params;
  const payment = await getPaymentByIdService(session, id).catch(() => null);

  if (!payment) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        render={
          <Link href="/patient/payments">
            <ArrowLeft />
            Back to payments
          </Link>
        }
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Invoice</CardTitle>
          <StatusBadge status={payment.status} />
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Amount</p>
              <p className="text-lg font-semibold">
                {formatCurrency(payment.amount.toString(), payment.currency)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Payment method</p>
              <p className="font-medium">{formatEnumLabel(payment.method)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium">{formatDateTime(payment.createdAt)}</p>
            </div>
            {payment.appointmentId && (
              <div>
                <p className="text-muted-foreground">Related appointment</p>
                <Link
                  href={`/patient/appointments/${payment.appointmentId}`}
                  className="text-primary font-medium hover:underline"
                >
                  View appointment
                </Link>
              </div>
            )}
          </div>

          {(payment.status === "REFUNDED" ||
            payment.status === "PARTIALLY_REFUNDED") && (
            <>
              <Separator />
              <div>
                <p className="text-muted-foreground">Refunded amount</p>
                <p className="font-medium">
                  {payment.refundedAmount
                    ? formatCurrency(
                        payment.refundedAmount.toString(),
                        payment.currency
                      )
                    : "-"}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
