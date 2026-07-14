import type { Metadata } from "next";

import { getPrescriptionReportService } from "@/features/reports/services/report.service";
import { reportRangeQuerySchema } from "@/features/reports/validation/report.validation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/patient/section-card";
import { DayCountBarChart } from "@/components/admin/dashboard-charts";
import { RangePicker } from "@/components/admin/reports/range-picker";

export const metadata: Metadata = {
  title: "Prescription Report - HealthCard Admin",
};

export default async function PrescriptionReportPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days } = await searchParams;
  const query = reportRangeQuerySchema.parse({ days: days ?? "30" });
  const report = await getPrescriptionReportService(query);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Prescription Report</h1>
          <p className="text-muted-foreground text-sm">
            {report.total} prescriptions issued.
          </p>
        </div>
        <RangePicker
          currentDays={query.days}
          basePath="/admin/reports/prescriptions"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Volume (last {query.days} days)</CardTitle>
        </CardHeader>
        <CardContent>
          <DayCountBarChart data={report.volume} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Prescribing Doctors</CardTitle>
        </CardHeader>
        <CardContent>
          {report.byDoctor.length === 0 ? (
            <EmptyState message="No prescriptions recorded yet." />
          ) : (
            <div className="flex flex-col gap-2">
              {report.byDoctor.map((doctor, index) => (
                <div
                  key={doctor.doctorId}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    {index + 1}. Dr. {doctor.doctorName}
                  </span>
                  <span className="font-medium">
                    {doctor.count} prescription(s)
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
