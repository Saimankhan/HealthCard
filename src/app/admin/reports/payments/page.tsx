import type { Metadata } from "next";

import { getPaymentReportService } from "@/features/reports/services/report.service";
import { reportRangeQuerySchema } from "@/features/reports/validation/report.validation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { CategoryBreakdownChart } from "@/components/admin/reports-charts";
import { RevenueTrendChart } from "@/components/admin/dashboard-charts";

export const metadata: Metadata = {
  title: "Payment Report - HealthCard Admin",
};

export default async function PaymentReportPage() {
  const report = await getPaymentReportService(
    reportRangeQuerySchema.parse({ days: 30 })
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Payment Report</h1>
        <p className="text-muted-foreground text-sm">
          {formatCurrency(report.totalRevenue)} total revenue collected.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By Status</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBreakdownChart
              data={report.byStatus.map((r) => ({
                label: r.status,
                count: r.count,
              }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By Method</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBreakdownChart
              data={report.byMethod.map((r) => ({
                label: r.method,
                count: r.count,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend (last 30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueTrendChart data={report.revenueByDay} />
        </CardContent>
      </Card>
    </div>
  );
}
