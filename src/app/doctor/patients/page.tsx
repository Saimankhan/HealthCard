import type { Metadata } from "next";

import { PatientsList } from "@/components/doctor/patients/patients-list";

export const metadata: Metadata = { title: "Patients - HealthCard" };

export default function DoctorPatientsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Patients</h1>
        <p className="text-muted-foreground text-sm">
          Patients assigned to you through appointments.
        </p>
      </div>
      <PatientsList />
    </div>
  );
}
