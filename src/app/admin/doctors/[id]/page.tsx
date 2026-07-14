import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getDoctorByIdService } from "@/features/doctors/services/doctor.service";
import { EditDoctorForm } from "@/components/admin/doctors/edit-doctor-form";

export const metadata: Metadata = { title: "Edit Doctor - HealthCard Admin" };

export default async function EditDoctorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const doctor = await getDoctorByIdService(id).catch(() => null);
  if (!doctor) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit Doctor</h1>
        <p className="text-muted-foreground text-sm">
          Update profile, specialization, and availability.
        </p>
      </div>
      <EditDoctorForm
        doctor={{
          id: doctor.id,
          userName: doctor.user.name,
          userEmail: doctor.user.email,
          licenseNumber: doctor.licenseNumber,
          bio: doctor.bio,
          experienceYears: doctor.experienceYears,
          consultationFee: doctor.consultationFee
            ? doctor.consultationFee.toString()
            : null,
          phone: doctor.phone,
          specializationIds: doctor.specializations.map(
            (s) => s.specialization.id
          ),
        }}
      />
    </div>
  );
}
