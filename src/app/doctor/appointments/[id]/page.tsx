import type { Metadata } from "next";

import { DoctorAppointmentDetail } from "@/components/doctor/appointments/appointment-detail";

export const metadata: Metadata = { title: "Appointment - HealthCard" };

export default async function DoctorAppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DoctorAppointmentDetail id={id} />;
}
