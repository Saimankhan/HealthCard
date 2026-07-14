import type { Metadata } from "next";

import { PatientsList } from "@/components/doctor/patients/patients-list";

export const metadata: Metadata = { title: "Patients - HealthCard Admin" };

export default function AdminPatientsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Patients</h1>
        <p className="text-muted-foreground text-sm">
          View and manage all patient records.
        </p>
      </div>
      <PatientsList basePath="/admin/patients" />
    </div>
  );
}
