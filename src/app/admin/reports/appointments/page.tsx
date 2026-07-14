import type { Metadata } from "next";

import { getAppointmentReportService } from "@/features/reports/services/report.service";
import { reportRangeQuerySchema } from "@/features/reports/validation/report.validation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryBreakdownChart } from "@/components/admin/reports-charts";
import { DayCountBarChart } from "@/components/admin/dashboard-charts";
import { RangePicker } from "@/components/admin/reports/range-picker";
import { ExportButton } from "@/components/admin/reports/export-button";

export const metadata: Metadata = {
  title: "Appointment Report - HealthCard Admin",
};

export default async function AppointmentReportPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days } = await searchParams;
  const query = reportRangeQuerySchema.parse({ days: days ?? "30" });
  const report = await getAppointmentReportService(query);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Appointment Report</h1>
          <p className="text-muted-foreground text-sm">
            {report.total} total appointments booked.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RangePicker
            currentDays={query.days}
            basePath="/admin/reports/appointments"
          />
          <ExportButton domain="appointments" />
        </div>
      </div>

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
          <CardTitle>Volume (last {query.days} days)</CardTitle>
        </CardHeader>
        <CardContent>
          <DayCountBarChart data={report.volume} />
        </CardContent>
      </Card>
    </div>
  );
}
