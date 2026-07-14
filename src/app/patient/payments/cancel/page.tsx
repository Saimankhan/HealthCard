import Link from "next/link";
import type { Metadata } from "next";
import { XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Payment Cancelled - HealthCard" };

export default async function PaymentCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentId?: string }>;
}) {
  const { paymentId } = await searchParams;

  return (
    <div className="flex flex-col items-center gap-6 py-12">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <XCircle className="text-muted-foreground size-12" />
          <div>
            <h1 className="text-xl font-semibold">Payment cancelled</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              No charge was made. You can try again any time from your payments
              page.
            </p>
          </div>
          <Button
            render={
              <Link
                href={
                  paymentId
                    ? `/patient/payments/${paymentId}`
                    : "/patient/payments"
                }
              >
                Back to payments
              </Link>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
