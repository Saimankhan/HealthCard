import type { Metadata } from "next";

import { getAppointmentReportService } from "@/features/reports/services/report.service";
import { reportRangeQuerySchema } from "@/features/reports/validation/report.validation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryBreakdownChart } from "@/components/admin/reports-charts";
import { DayCountBarChart } from "@/components/admin/dashboard-charts";

export const metadata: Metadata = {
  title: "Appointment Report - HealthCard Admin",
};

export default async function AppointmentReportPage() {
  const report = await getAppointmentReportService(
    reportRangeQuerySchema.parse({ days: 30 })
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Appointment Report</h1>
        <p className="text-muted-foreground text-sm">
          {report.total} total appointments booked.
        </p>
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
          <CardTitle>Volume (last 30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <DayCountBarChart data={report.volume} />
        </CardContent>
      </Card>
    </div>
  );
}
