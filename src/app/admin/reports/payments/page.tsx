import type { Metadata } from "next";

import { getPaymentReportService } from "@/features/reports/services/report.service";
import { reportRangeQuerySchema } from "@/features/reports/validation/report.validation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { CategoryBreakdownChart } from "@/components/admin/reports-charts";
import { RevenueTrendChart } from "@/components/admin/dashboard-charts";
import { RangePicker } from "@/components/admin/reports/range-picker";
import { ExportButton } from "@/components/admin/reports/export-button";

export const metadata: Metadata = {
  title: "Payment Report - HealthCard Admin",
};

export default async function PaymentReportPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days } = await searchParams;
  const query = reportRangeQuerySchema.parse({ days: days ?? "30" });
  const report = await getPaymentReportService(query);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Payment Report</h1>
          <p className="text-muted-foreground text-sm">
            {formatCurrency(report.totalRevenue)} total revenue collected.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RangePicker
            currentDays={query.days}
            basePath="/admin/reports/payments"
          />
          <ExportButton domain="payments" />
          <ExportButton domain="revenue" label="Export revenue" />
        </div>
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
          <CardTitle>Revenue Trend (last {query.days} days)</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueTrendChart data={report.revenueByDay} />
        </CardContent>
      </Card>
    </div>
  );
}
