import type { Metadata } from "next";

import { getCurrentSession } from "@/core/auth/rbac";
import { getOwnDoctorProfileService } from "@/features/doctors/services/doctor.service";
import { getUserByIdService } from "@/features/users/services/user.service";
import { DoctorProfileForm } from "@/components/doctor/profile-form";

export const metadata: Metadata = { title: "Profile - HealthCard" };

export default async function DoctorProfilePage() {
  const session = await getCurrentSession();
  if (!session) return null;

  const [doctor, user] = await Promise.all([
    getOwnDoctorProfileService(session),
    getUserByIdService(session.user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-muted-foreground text-sm">
          Manage your public profile, specialization, and availability.
        </p>
      </div>

      <DoctorProfileForm
        doctor={{
          id: doctor.id,
          licenseNumber: doctor.licenseNumber,
          bio: doctor.bio,
          experienceYears: doctor.experienceYears,
          consultationFee: doctor.consultationFee
            ? doctor.consultationFee.toString()
            : null,
          phone: doctor.phone,
          availability: Array.isArray(doctor.availability)
            ? (doctor.availability as never[])
            : null,
          specializationIds: doctor.specializations.map(
            (s) => s.specialization.id
          ),
        }}
        user={{ name: user.name, email: user.email, image: user.image }}
      />
    </div>
  );
}
