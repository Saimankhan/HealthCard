import Link from "next/link";
import type { Metadata } from "next";

import { getCurrentSession } from "@/core/auth/rbac";
import { listPaymentsService } from "@/features/payments/services/payment.service";
import { listPaymentsQuerySchema } from "@/features/payments/validation/payment.validation";

import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/patient/status-badge";
import { EmptyState } from "@/components/patient/section-card";
import { formatCurrency, formatDate, formatEnumLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Payments - HealthCard" };

export default async function PaymentsPage() {
  const session = await getCurrentSession();
  if (!session) return null;

  const { items } = await listPaymentsService(
    session,
    listPaymentsQuerySchema.parse({ page: 1, pageSize: 50, sortOrder: "desc" })
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Payments</h1>
        <p className="text-muted-foreground text-sm">
          Your payment history and invoices.
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState message="No payments yet." />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((payment) => (
            <Link key={payment.id} href={`/patient/payments/${payment.id}`}>
              <Card className="hover:bg-muted/40 transition-colors">
                <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-medium">
                      {formatCurrency(
                        payment.amount.toString(),
                        payment.currency
                      )}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {formatDate(payment.createdAt)} &middot;{" "}
                      {formatEnumLabel(payment.method)}
                    </p>
                  </div>
                  <StatusBadge status={payment.status} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
