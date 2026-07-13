import type { Metadata } from "next";
import { AppointmentsList } from "@/components/patient/appointments/appointments-list";

export const metadata: Metadata = { title: "Appointments - HealthCard" };

export default function AppointmentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Appointments</h1>
          <p className="text-muted-foreground text-sm">
            View and manage your appointments.
          </p>
        </div>
      </div>
      <AppointmentsList />
    </div>
  );
}
