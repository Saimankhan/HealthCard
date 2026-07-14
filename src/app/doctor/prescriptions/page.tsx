import type { Metadata } from "next";

import { DoctorPrescriptionsList } from "@/components/doctor/prescriptions/prescriptions-list";

export const metadata: Metadata = { title: "Prescriptions - HealthCard" };

export default function DoctorPrescriptionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Prescriptions</h1>
        <p className="text-muted-foreground text-sm">
          Prescriptions you have issued to your patients.
        </p>
      </div>
      <DoctorPrescriptionsList />
    </div>
  );
}
