import { Suspense } from "react";
import type { Metadata } from "next";

import { Skeleton } from "@/components/ui/skeleton";
import { AppointmentDetail } from "@/components/patient/appointments/appointment-detail";

export const metadata: Metadata = { title: "Appointment - HealthCard" };

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <AppointmentDetail id={id} />
    </Suspense>
  );
}
