import type { Metadata } from "next";
import { DollarSign, RotateCcw, TrendingUp } from "lucide-react";

import { getPaymentReportService } from "@/features/reports/services/report.service";
import { reportRangeQuerySchema } from "@/features/reports/validation/report.validation";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { AdminPaymentsList } from "@/components/admin/payments/payments-list";

export const metadata: Metadata = { title: "Payments - HealthCard Admin" };

export default async function AdminPaymentsPage() {
  const report = await getPaymentReportService(
    reportRangeQuerySchema.parse({ days: 30 })
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Payments</h1>
        <p className="text-muted-foreground text-sm">
          Payment history, revenue, and refunds.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <DollarSign className="text-primary size-8 shrink-0" />
            <div>
              <p className="text-2xl font-semibold">
                {formatCurrency(report.totalRevenue)}
              </p>
              <p className="text-muted-foreground text-xs">Total revenue</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <TrendingUp className="text-primary size-8 shrink-0" />
            <div>
              <p className="text-2xl font-semibold">
                {report.byStatus.reduce((sum, r) => sum + r.count, 0)}
              </p>
              <p className="text-muted-foreground text-xs">
                Total transactions
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <RotateCcw className="text-primary size-8 shrink-0" />
            <div>
              <p className="text-2xl font-semibold">
                {formatCurrency(report.refundTotal)}
              </p>
              <p className="text-muted-foreground text-xs">
                Refunded ({report.refundCount})
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <AdminPaymentsList />
    </div>
  );
}
