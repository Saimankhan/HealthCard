import type { Metadata } from "next";
import { PrescriptionsList } from "@/components/patient/prescriptions/prescriptions-list";

export const metadata: Metadata = { title: "Prescriptions - HealthCard" };

export default function PrescriptionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Prescriptions</h1>
        <p className="text-muted-foreground text-sm">
          View and download your prescriptions.
        </p>
      </div>
      <PrescriptionsList />
    </div>
  );
}
