import type { Metadata } from "next";

import { DoctorAppointmentsList } from "@/components/doctor/appointments/appointments-list";

export const metadata: Metadata = { title: "Appointments - HealthCard" };

export default function DoctorAppointmentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Appointments</h1>
        <p className="text-muted-foreground text-sm">
          Manage your appointment requests and schedule.
        </p>
      </div>
      <DoctorAppointmentsList />
    </div>
  );
}
