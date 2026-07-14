import type { Metadata } from "next";

import { CreatePrescriptionForm } from "@/components/doctor/prescriptions/prescription-form";

export const metadata: Metadata = { title: "New Prescription - HealthCard" };

export default async function NewPrescriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string; appointmentId?: string }>;
}) {
  const { patientId, appointmentId } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">New Prescription</h1>
        <p className="text-muted-foreground text-sm">
          Write a prescription for one of your patients.
        </p>
      </div>
      <CreatePrescriptionForm
        initialPatientId={patientId}
        initialAppointmentId={appointmentId}
      />
    </div>
  );
}
