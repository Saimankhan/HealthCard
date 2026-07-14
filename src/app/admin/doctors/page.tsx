import type { Metadata } from "next";

import { DoctorsList } from "@/components/admin/doctors/doctors-list";

export const metadata: Metadata = { title: "Doctors - HealthCard Admin" };

export default function AdminDoctorsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Doctors</h1>
        <p className="text-muted-foreground text-sm">
          Manage doctor accounts, specializations, and availability.
        </p>
      </div>
      <DoctorsList />
    </div>
  );
}
