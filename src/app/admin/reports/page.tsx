import Link from "next/link";
import type { Metadata } from "next";
import {
  HeartPulse,
  Stethoscope,
  CalendarDays,
  CreditCard,
  Pill,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
} from "lucide-react";

import {
  getDauReportService,
  getDashboardOverviewService,
  getSystemHealthService,
} from "@/features/reports/services/report.service";
import { reportRangeQuerySchema } from "@/features/reports/validation/report.validation";
import { getCurrentSession } from "@/core/auth/rbac";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DayCountBarChart } from "@/components/admin/dashboard-charts";
import { ExportButton } from "@/components/admin/reports/export-button";

export const metadata: Metadata = { title: "Reports - HealthCard Admin" };

const REPORTS = [
  {
    href: "/admin/reports/patients",
    label: "Patient Reports",
    description: "Demographics, blood groups, and registration trends.",
    icon: HeartPulse,
  },
  {
    href: "/admin/reports/doctors",
    label: "Doctor Reports",
    description: "Specialization mix and top doctors by volume.",
    icon: Stethoscope,
  },
  {
    href: "/admin/reports/appointments",
    label: "Appointment Reports",
    description: "Status breakdown and appointment volume trends.",
    icon: CalendarDays,
  },
  {
    href: "/admin/reports/payments",
    label: "Payment Reports",
    description: "Revenue by status, method, and time.",
    icon: CreditCard,
  },
  {
    href: "/admin/reports/prescriptions",
    label: "Prescription Reports",
    description: "Volume trends and top prescribing doctors.",
    icon: Pill,
  },
];

function GrowthBadge({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <Badge variant={isPositive ? "default" : "destructive"} className="gap-1">
      {isPositive ? (
        <TrendingUp className="size-3" />
      ) : (
        <TrendingDown className="size-3" />
      )}
      {isPositive ? "+" : ""}
      {value}%
    </Badge>
  );
}

export default async function AdminReportsPage() {
  const session = await getCurrentSession();
  if (!session) return null;

  const rangeQuery = reportRangeQuerySchema.parse({ days: 14 });
  const [overview, dau, health] = await Promise.all([
    getDashboardOverviewService(session, rangeQuery),
    getDauReportService(rangeQuery),
    getSystemHealthService(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-muted-foreground text-sm">
          Analytics across patients, doctors, appointments, payments, and
          prescriptions.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col gap-1 py-5">
            <p className="text-muted-foreground text-xs">
              Patient growth (14d)
            </p>
            <GrowthBadge value={overview.growth.patients} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 py-5">
            <p className="text-muted-foreground text-xs">
              Appointment growth (14d)
            </p>
            <GrowthBadge value={overview.growth.appointments} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 py-5">
            <p className="text-muted-foreground text-xs">
              Revenue growth (14d)
            </p>
            <GrowthBadge value={overview.growth.revenue} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <Activity
              className={
                health.status === "ok"
                  ? "size-8 shrink-0 text-emerald-500"
                  : "text-destructive size-8 shrink-0"
              }
            />
            <div>
              <p className="text-sm font-medium">
                {health.status === "ok"
                  ? "All systems normal"
                  : "Database error"}
              </p>
              <p className="text-muted-foreground text-xs">
                DB latency {health.latencyMs}ms
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="mb-2 flex items-center gap-2">
            <Users className="text-muted-foreground size-4" />
            <p className="text-sm font-medium">
              Daily active users (last 14 days) &middot; {dau.today} today
            </p>
          </div>
          <DayCountBarChart data={dau.series} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Exports</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <ExportButton domain="patients" label="Patients" />
          <ExportButton domain="doctors" label="Doctors" />
          <ExportButton domain="appointments" label="Appointments" />
          <ExportButton domain="payments" label="Payments" />
          <ExportButton domain="revenue" label="Revenue" />
          <ExportButton domain="medical-history" label="Medical History" />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {REPORTS.map((report) => (
          <Link key={report.href} href={report.href}>
            <Card className="hover:bg-muted/40 transition-colors">
              <CardContent className="flex items-start gap-3 py-5">
                <report.icon className="text-primary size-8 shrink-0" />
                <div>
                  <p className="font-medium">{report.label}</p>
                  <p className="text-muted-foreground text-sm">
                    {report.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
