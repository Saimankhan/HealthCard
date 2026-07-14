import type { Metadata } from "next";

import { getPatientReportService } from "@/features/reports/services/report.service";
import { reportRangeQuerySchema } from "@/features/reports/validation/report.validation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryBreakdownChart } from "@/components/admin/reports-charts";
import { DayCountBarChart } from "@/components/admin/dashboard-charts";
import { RangePicker } from "@/components/admin/reports/range-picker";
import { ExportButton } from "@/components/admin/reports/export-button";

export const metadata: Metadata = {
  title: "Patient Report - HealthCard Admin",
};

export default async function PatientReportPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days } = await searchParams;
  const query = reportRangeQuerySchema.parse({ days: days ?? "30" });
  const report = await getPatientReportService(query);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Patient Report</h1>
          <p className="text-muted-foreground text-sm">
            {report.total} total patients registered.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RangePicker
            currentDays={query.days}
            basePath="/admin/reports/patients"
          />
          <ExportButton domain="patients" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By Gender</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBreakdownChart
              data={report.byGender.map((r) => ({
                label: r.gender,
                count: r.count,
              }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By Blood Group</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBreakdownChart
              data={report.byBloodGroup.map((r) => ({
                label: r.bloodGroup,
                count: r.count,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrations (last {query.days} days)</CardTitle>
        </CardHeader>
        <CardContent>
          <DayCountBarChart data={report.registrations} />
        </CardContent>
      </Card>
    </div>
  );
}
