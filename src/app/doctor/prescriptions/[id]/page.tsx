import type { Metadata } from "next";

import { EditPrescriptionForm } from "@/components/doctor/prescriptions/edit-prescription-form";

export const metadata: Metadata = { title: "Prescription - HealthCard" };

export default async function DoctorPrescriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditPrescriptionForm id={id} />;
}
