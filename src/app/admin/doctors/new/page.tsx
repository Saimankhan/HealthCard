import type { Metadata } from "next";

import { AddDoctorForm } from "@/components/admin/doctors/add-doctor-form";

export const metadata: Metadata = { title: "Add Doctor - HealthCard Admin" };

export default function AddDoctorPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Add Doctor</h1>
        <p className="text-muted-foreground text-sm">
          Promote an existing user account to a doctor profile.
        </p>
      </div>
      <AddDoctorForm />
    </div>
  );
}
