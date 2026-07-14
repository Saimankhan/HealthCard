import type { Metadata } from "next";

import { AdminAppointmentDetail } from "@/components/admin/appointments/appointment-detail";

export const metadata: Metadata = { title: "Appointment - HealthCard Admin" };

export default async function AdminAppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminAppointmentDetail id={id} />;
}
