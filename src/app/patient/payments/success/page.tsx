import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";

import { getCurrentSession } from "@/core/auth/rbac";
import { verifyPaymentService } from "@/features/payments/services/payment.service";
import { verifyPaymentQuerySchema } from "@/features/payments/validation/payment.validation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

export const metadata: Metadata = { title: "Payment Result - HealthCard" };

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) return null;

  const { session_id: sessionId } = await searchParams;
  const parsed = sessionId
    ? verifyPaymentQuerySchema.safeParse({ sessionId })
    : null;

  const payment = parsed?.success
    ? await verifyPaymentService(session, parsed.data.sessionId).catch(
        () => null
      )
    : null;

  const succeeded = payment?.status === "SUCCEEDED";

  return (
    <div className="flex flex-col items-center gap-6 py-12">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          {succeeded ? (
            <>
              <CheckCircle2 className="text-primary size-12" />
              <div>
                <h1 className="text-xl font-semibold">Payment successful</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  {payment &&
                    `We've received your payment of ${formatCurrency(
                      payment.amount.toString(),
                      payment.currency
                    )}.`}
                </p>
              </div>
            </>
          ) : (
            <>
              <XCircle className="text-destructive size-12" />
              <div>
                <h1 className="text-xl font-semibold">
                  We couldn&apos;t confirm this payment
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  If you were charged, your payment status will update shortly.
                  Check your payment history for the latest status.
                </p>
              </div>
            </>
          )}
          <Button
            render={
              <Link
                href={
                  payment
                    ? `/patient/payments/${payment.id}`
                    : "/patient/payments"
                }
              >
                View payments
              </Link>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
