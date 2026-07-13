import type { Metadata } from "next";
import { PrescriptionDetail } from "@/components/patient/prescriptions/prescription-detail";

export const metadata: Metadata = { title: "Prescription - HealthCard" };

export default async function PrescriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PrescriptionDetail id={id} />;
}
