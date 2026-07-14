import type { Metadata } from "next";

import { getDoctorReportService } from "@/features/reports/services/report.service";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/patient/section-card";
import { CategoryBreakdownChart } from "@/components/admin/reports-charts";
import { ExportButton } from "@/components/admin/reports/export-button";

export const metadata: Metadata = { title: "Doctor Report - HealthCard Admin" };

export default async function DoctorReportPage() {
  const report = await getDoctorReportService();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Doctor Report</h1>
          <p className="text-muted-foreground text-sm">
            {report.total} total doctors on the platform.
          </p>
        </div>
        <ExportButton domain="doctors" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By Specialization</CardTitle>
        </CardHeader>
        <CardContent>
          {report.bySpecialization.length === 0 ? (
            <EmptyState message="No specializations assigned yet." />
          ) : (
            <CategoryBreakdownChart
              data={report.bySpecialization.map((r) => ({
                label: r.specialization,
                count: r.count,
              }))}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Doctors by Appointment Volume</CardTitle>
        </CardHeader>
        <CardContent>
          {report.topDoctors.length === 0 ? (
            <EmptyState message="No appointments recorded yet." />
          ) : (
            <div className="flex flex-col gap-2">
              {report.topDoctors.map((doctor, index) => (
                <div
                  key={doctor.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    {index + 1}. Dr. {doctor.name}
                  </span>
                  <span className="font-medium">
                    {doctor.appointmentCount} appointment(s)
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
