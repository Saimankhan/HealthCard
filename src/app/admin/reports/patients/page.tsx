import type { Metadata } from "next";

import { getPatientReportService } from "@/features/reports/services/report.service";
import { reportRangeQuerySchema } from "@/features/reports/validation/report.validation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryBreakdownChart } from "@/components/admin/reports-charts";
import { DayCountBarChart } from "@/components/admin/dashboard-charts";

export const metadata: Metadata = {
  title: "Patient Report - HealthCard Admin",
};

export default async function PatientReportPage() {
  const report = await getPatientReportService(
    reportRangeQuerySchema.parse({ days: 30 })
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Patient Report</h1>
        <p className="text-muted-foreground text-sm">
          {report.total} total patients registered.
        </p>
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
          <CardTitle>Registrations (last 30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <DayCountBarChart data={report.registrations} />
        </CardContent>
      </Card>
    </div>
  );
}
