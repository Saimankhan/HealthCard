import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, Users, Pill, ClipboardList } from "lucide-react";

import { getCurrentSession } from "@/core/auth/rbac";
import { listAppointmentsService } from "@/features/appointments/services/appointment.service";
import { listAppointmentsQuerySchema } from "@/features/appointments/validation/appointment.validation";
import { listPrescriptionsService } from "@/features/prescriptions/services/prescription.service";
import { listPrescriptionsQuerySchema } from "@/features/prescriptions/validation/prescription.validation";
import { listMedicalHistoryService } from "@/features/medical-history/services/medical-history.service";
import { listMedicalHistoryQuerySchema } from "@/features/medical-history/validation/medical-history.validation";
import { listPatientsService } from "@/features/patients/services/patient.service";
import { listPatientsQuerySchema } from "@/features/patients/validation/patient.validation";
import { listOwnNotificationsService } from "@/features/notifications/services/notification.service";
import { listNotificationsQuerySchema } from "@/features/notifications/validation/notification.validation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionCard, EmptyState } from "@/components/patient/section-card";
import { StatusBadge } from "@/components/patient/status-badge";
import { formatDateTime, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard - HealthCard" };

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default async function DoctorDashboardPage() {
  const session = await getCurrentSession();
  if (!session) return null;

  const now = new Date();

  const [
    appointments,
    completedAppointments,
    prescriptions,
    history,
    patients,
    notifications,
  ] = await Promise.all([
    listAppointmentsService(
      session,
      listAppointmentsQuerySchema.parse({
        page: 1,
        pageSize: 20,
        sortOrder: "asc",
        from: now.toISOString(),
      })
    ),
    listAppointmentsService(
      session,
      listAppointmentsQuerySchema.parse({
        page: 1,
        pageSize: 50,
        sortOrder: "desc",
        status: "COMPLETED",
      })
    ),
    listPrescriptionsService(
      session,
      listPrescriptionsQuerySchema.parse({
        page: 1,
        pageSize: 50,
        sortOrder: "desc",
      })
    ),
    listMedicalHistoryService(
      session,
      listMedicalHistoryQuerySchema.parse({
        page: 1,
        pageSize: 5,
        sortOrder: "desc",
      })
    ),
    listPatientsService(
      session,
      listPatientsQuerySchema.parse({ page: 1, pageSize: 1, sortOrder: "desc" })
    ),
    listOwnNotificationsService(
      session,
      listNotificationsQuerySchema.parse({
        page: 1,
        pageSize: 5,
        sortOrder: "desc",
      })
    ),
  ]);

  const activeAppointments = appointments.items.filter(
    (appt) => appt.status === "PENDING" || appt.status === "CONFIRMED"
  );
  const todaysAppointments = activeAppointments.filter((appt) =>
    isSameDay(new Date(appt.scheduledAt), now)
  );
  const upcomingAppointments = activeAppointments.filter(
    (appt) => !isSameDay(new Date(appt.scheduledAt), now)
  );

  const prescribedAppointmentIds = new Set(
    prescriptions.items
      .map((rx) => rx.appointmentId)
      .filter((id): id is string => Boolean(id))
  );
  const pendingPrescriptions = completedAppointments.items.filter(
    (appt) => !prescribedAppointmentIds.has(appt.id)
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome back, Dr. {session.user.name.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground text-sm">
          Here&apos;s an overview of your practice today.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <CalendarDays className="text-primary size-8 shrink-0" />
            <div>
              <p className="text-2xl font-semibold">
                {todaysAppointments.length}
              </p>
              <p className="text-muted-foreground text-xs">
                Today&apos;s appointments
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <Users className="text-primary size-8 shrink-0" />
            <div>
              <p className="text-2xl font-semibold">{patients.meta.total}</p>
              <p className="text-muted-foreground text-xs">Assigned patients</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <Pill className="text-primary size-8 shrink-0" />
            <div>
              <p className="text-2xl font-semibold">
                {pendingPrescriptions.length}
              </p>
              <p className="text-muted-foreground text-xs">
                Pending prescriptions
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <ClipboardList className="text-primary size-8 shrink-0" />
            <div>
              <p className="text-2xl font-semibold">
                {upcomingAppointments.length}
              </p>
              <p className="text-muted-foreground text-xs">
                Upcoming appointments
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          render={<Link href="/doctor/appointments">View appointments</Link>}
        />
        <Button
          size="sm"
          variant="outline"
          render={<Link href="/doctor/patients">View patients</Link>}
        />
        <Button
          size="sm"
          variant="outline"
          render={
            <Link href="/doctor/prescriptions/new">Write prescription</Link>
          }
        />
        <Button
          size="sm"
          variant="outline"
          render={<Link href="/doctor/profile">Update availability</Link>}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SectionCard
          title="Today's Appointments"
          viewAllHref="/doctor/appointments"
        >
          {todaysAppointments.length === 0 ? (
            <EmptyState message="No appointments scheduled for today." />
          ) : (
            todaysAppointments.map((appt) => (
              <div
                key={appt.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {appt.patient.user.name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatDateTime(appt.scheduledAt)}
                  </p>
                </div>
                <StatusBadge status={appt.status} />
              </div>
            ))
          )}
        </SectionCard>

        <SectionCard
          title="Upcoming Appointments"
          viewAllHref="/doctor/appointments"
        >
          {upcomingAppointments.length === 0 ? (
            <EmptyState message="No upcoming appointments." />
          ) : (
            upcomingAppointments.slice(0, 5).map((appt) => (
              <div
                key={appt.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {appt.patient.user.name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatDateTime(appt.scheduledAt)}
                  </p>
                </div>
                <StatusBadge status={appt.status} />
              </div>
            ))
          )}
        </SectionCard>

        <SectionCard
          title="Recent Prescriptions"
          viewAllHref="/doctor/prescriptions"
        >
          {prescriptions.items.length === 0 ? (
            <EmptyState message="No prescriptions issued yet." />
          ) : (
            prescriptions.items.slice(0, 5).map((rx) => (
              <div key={rx.id} className="text-sm">
                <p className="font-medium">{rx.patient.user.name}</p>
                <p className="text-muted-foreground text-xs">
                  {formatDate(rx.issuedAt)} &middot;{" "}
                  {Array.isArray(rx.medications) ? rx.medications.length : 0}{" "}
                  medication(s)
                </p>
              </div>
            ))
          )}
        </SectionCard>

        <SectionCard
          title="Recent Medical History Updates"
          viewAllHref="/doctor/patients"
        >
          {history.items.length === 0 ? (
            <EmptyState message="No recent updates." />
          ) : (
            history.items.map((entry) => (
              <div key={entry.id} className="text-sm">
                <p className="font-medium">{entry.condition}</p>
                <p className="text-muted-foreground text-xs">
                  {formatDate(entry.recordedAt)}
                </p>
              </div>
            ))
          )}
        </SectionCard>

        <SectionCard title="Notifications" viewAllHref="/doctor/notifications">
          {notifications.items.length === 0 ? (
            <EmptyState message="You're all caught up." />
          ) : (
            notifications.items.map((n) => (
              <div key={n.id} className="flex items-start gap-2 text-sm">
                <CalendarDays className="text-muted-foreground mt-0.5 size-4 shrink-0" />
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
