import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, IdCard } from "lucide-react";

import { getCurrentSession } from "@/core/auth/rbac";
import { listAppointmentsService } from "@/features/appointments/services/appointment.service";
import { listAppointmentsQuerySchema } from "@/features/appointments/validation/appointment.validation";
import { listPrescriptionsService } from "@/features/prescriptions/services/prescription.service";
import { listPrescriptionsQuerySchema } from "@/features/prescriptions/validation/prescription.validation";
import { listMedicalHistoryService } from "@/features/medical-history/services/medical-history.service";
import { listMedicalHistoryQuerySchema } from "@/features/medical-history/validation/medical-history.validation";
import { getOwnHealthCardService } from "@/features/healthcard/services/health-card.service";
import { listPaymentsService } from "@/features/payments/services/payment.service";
import { listPaymentsQuerySchema } from "@/features/payments/validation/payment.validation";
import { listOwnNotificationsService } from "@/features/notifications/services/notification.service";
import { listNotificationsQuerySchema } from "@/features/notifications/validation/notification.validation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionCard, EmptyState } from "@/components/patient/section-card";
import { StatusBadge } from "@/components/patient/status-badge";
import { formatCurrency, formatDateTime, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard - HealthCard" };

export default async function PatientDashboardPage() {
  const session = await getCurrentSession();
  if (!session) return null;

  const [appointments, prescriptions, history, notifications] =
    await Promise.all([
      listAppointmentsService(
        session,
        listAppointmentsQuerySchema.parse({
          page: 1,
          pageSize: 5,
          sortOrder: "asc",
          from: new Date().toISOString(),
        })
      ),
      listPrescriptionsService(
        session,
        listPrescriptionsQuerySchema.parse({
          page: 1,
          pageSize: 5,
          sortOrder: "desc",
        })
      ),
      listMedicalHistoryService(
        session,
        listMedicalHistoryQuerySchema.parse({
          page: 1,
          pageSize: 3,
          sortOrder: "desc",
        })
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

  const payments = await listPaymentsService(
    session,
    listPaymentsQuerySchema.parse({ page: 1, pageSize: 5, sortOrder: "desc" })
  );

  const healthCard = await getOwnHealthCardService(session).catch(() => null);

  const upcomingAppointments = appointments.items.filter(
    (appt) => appt.status === "PENDING" || appt.status === "CONFIRMED"
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome back, {session.user.name.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground text-sm">
          Here&apos;s an overview of your health activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SectionCard
          title="Upcoming Appointments"
          viewAllHref="/patient/appointments"
        >
          {upcomingAppointments.length === 0 ? (
            <EmptyState message="No upcoming appointments." />
          ) : (
            upcomingAppointments.map((appt) => (
              <div
                key={appt.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    Dr. {appt.doctor.user.name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatDateTime(appt.scheduledAt)}
                  </p>
                </div>
                <StatusBadge status={appt.status} />
              </div>
            ))
          )}
          <Button
            size="sm"
            className="mt-1"
            render={
              <Link href="/patient/appointments/book">Book appointment</Link>
            }
          />
        </SectionCard>

        <SectionCard
          title="Recent Prescriptions"
          viewAllHref="/patient/prescriptions"
        >
          {prescriptions.items.length === 0 ? (
            <EmptyState message="No prescriptions yet." />
          ) : (
            prescriptions.items.map((rx) => (
              <div key={rx.id} className="text-sm">
                <p className="font-medium">Dr. {rx.doctor.user.name}</p>
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
          title="Medical History Summary"
          viewAllHref="/patient/medical-history"
        >
          {history.items.length === 0 ? (
            <EmptyState message="No medical history recorded." />
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

        <Card>
          <CardContent className="flex items-center justify-between gap-4 py-6">
            <div>
              <p className="text-muted-foreground text-sm">
                Digital Health Card
              </p>
              {healthCard ? (
                <>
                  <p className="font-mono text-lg font-semibold">
                    {healthCard.cardNumber}
                  </p>
                  <StatusBadge status={healthCard.status} />
                </>
              ) : (
                <p className="text-sm">Not issued yet.</p>
              )}
            </div>
            <IdCard className="text-muted-foreground size-10 shrink-0" />
          </CardContent>
          <CardContent className="pt-0">
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/patient/health-card">View Health Card</Link>}
            />
          </CardContent>
        </Card>

        <SectionCard title="Recent Payments" viewAllHref="/patient/payments">
          {payments.items.length === 0 ? (
            <EmptyState message="No payments yet." />
          ) : (
            payments.items.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between text-sm"
              >
                <div>
                  <p className="font-medium">
                    {formatCurrency(
                      payment.amount.toString(),
                      payment.currency
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatDate(payment.createdAt)}
                  </p>
                </div>
                <StatusBadge status={payment.status} />
              </div>
            ))
          )}
        </SectionCard>

        <SectionCard title="Notifications" viewAllHref="/patient/notifications">
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
