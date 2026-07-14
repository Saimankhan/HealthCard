import Link from "next/link";
import type { Metadata } from "next";
import {
  Users,
  HeartPulse,
  Stethoscope,
  CalendarDays,
  DollarSign,
  UserPlus,
  ScrollText,
  BarChart3,
} from "lucide-react";

import { getCurrentSession } from "@/core/auth/rbac";
import { getDashboardOverviewService } from "@/features/reports/services/report.service";
import { reportRangeQuerySchema } from "@/features/reports/validation/report.validation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionCard, EmptyState } from "@/components/patient/section-card";
import { StatusBadge } from "@/components/patient/status-badge";
import { formatCurrency, formatDateTime, formatEnumLabel } from "@/lib/format";
import {
  DayCountBarChart,
  RevenueTrendChart,
} from "@/components/admin/dashboard-charts";

export const metadata: Metadata = { title: "Dashboard - HealthCard Admin" };

export default async function AdminDashboardPage() {
  const session = await getCurrentSession();
  if (!session) return null;

  const overview = await getDashboardOverviewService(
    session,
    reportRangeQuerySchema.parse({ days: 14 })
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          System-wide overview of HealthCard.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <Users className="text-primary size-8 shrink-0" />
            <div>
              <p className="text-2xl font-semibold">{overview.totalUsers}</p>
              <p className="text-muted-foreground text-xs">Total users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <HeartPulse className="text-primary size-8 shrink-0" />
            <div>
              <p className="text-2xl font-semibold">{overview.totalPatients}</p>
              <p className="text-muted-foreground text-xs">Total patients</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <Stethoscope className="text-primary size-8 shrink-0" />
            <div>
              <p className="text-2xl font-semibold">{overview.totalDoctors}</p>
              <p className="text-muted-foreground text-xs">Total doctors</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <CalendarDays className="text-primary size-8 shrink-0" />
            <div>
              <p className="text-2xl font-semibold">
                {overview.totalAppointments}
              </p>
              <p className="text-muted-foreground text-xs">Appointments</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <DollarSign className="text-primary size-8 shrink-0" />
            <div>
              <p className="text-2xl font-semibold">
                {formatCurrency(overview.totalRevenue)}
              </p>
              <p className="text-muted-foreground text-xs">Revenue</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          render={<Link href="/admin/users">Manage users</Link>}
        />
        <Button
          size="sm"
          variant="outline"
          render={<Link href="/admin/doctors">Manage doctors</Link>}
        />
        <Button
          size="sm"
          variant="outline"
          render={<Link href="/admin/appointments">View appointments</Link>}
        />
        <Button
          size="sm"
          variant="outline"
          render={<Link href="/admin/reports">View reports</Link>}
        />
        <Button
          size="sm"
          variant="outline"
          render={
            <Link href="/admin/notifications">
              <UserPlus className="mr-1 size-4" />
              Broadcast announcement
            </Link>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="py-4">
            <p className="mb-2 text-sm font-medium">Revenue (last 14 days)</p>
            <RevenueTrendChart data={overview.revenueByDay} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="mb-2 text-sm font-medium">
              Appointment volume (last 14 days)
            </p>
            <DayCountBarChart data={overview.appointmentVolume} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SectionCard title="Appointments by Status">
          {overview.appointmentsByStatus.length === 0 ? (
            <EmptyState message="No appointments yet." />
          ) : (
            overview.appointmentsByStatus.map((row) => (
              <div
                key={row.status}
                className="flex items-center justify-between text-sm"
              >
                <StatusBadge status={row.status} />
                <span className="font-medium">{row.count}</span>
              </div>
            ))
          )}
        </SectionCard>

        <SectionCard title="Recent Activity" viewAllHref="/admin/audit-logs">
          {overview.recentActivity.length === 0 ? (
            <EmptyState message="No activity recorded yet." />
          ) : (
            overview.recentActivity.map((log) => (
              <div key={log.id} className="flex items-start gap-2 text-sm">
                <ScrollText className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {log.actor?.name ?? "System"} &middot;{" "}
                    {formatEnumLabel(log.action)} {log.entityType}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatDateTime(log.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </SectionCard>

        <SectionCard title="Notifications" viewAllHref="/admin/notifications">
          {overview.notifications.length === 0 ? (
            <EmptyState message="You're all caught up." />
          ) : (
            overview.notifications.map((n) => (
              <div key={n.id} className="flex items-start gap-2 text-sm">
                <BarChart3 className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{n.title}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {n.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </SectionCard>
      </div>
    </div>
  );
}
