import type { Metadata } from "next";

import { AdminAppointmentsList } from "@/components/admin/appointments/appointments-list";

export const metadata: Metadata = { title: "Appointments - HealthCard Admin" };

export default function AdminAppointmentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Appointments</h1>
        <p className="text-muted-foreground text-sm">
          Search, filter, and manage every appointment in the system.
        </p>
      </div>
      <AdminAppointmentsList />
    </div>
  );
}
