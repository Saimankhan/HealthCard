import type { Metadata } from "next";

import { getCurrentSession } from "@/core/auth/rbac";
import { getOwnPatientProfileService } from "@/features/patients/services/patient.service";
import { ProfileForm } from "@/components/patient/profile-form";

export const metadata: Metadata = { title: "Profile - HealthCard" };

export default async function PatientProfilePage() {
  const session = await getCurrentSession();
  if (!session) return null;

  const patient = await getOwnPatientProfileService(session);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-muted-foreground text-sm">
          Manage your personal information and health details.
        </p>
      </div>
      <ProfileForm
        patient={{
          id: patient.id,
          dateOfBirth: patient.dateOfBirth
            ? patient.dateOfBirth.toISOString().slice(0, 10)
            : "",
          gender: patient.gender,
          bloodGroup: patient.bloodGroup,
          phone: patient.phone ?? "",
          address: patient.address ?? "",
          emergencyContactName: patient.emergencyContactName ?? "",
          emergencyContactPhone: patient.emergencyContactPhone ?? "",
        }}
        user={{
          name: patient.user.name,
          email: patient.user.email,
          image: patient.user.image,
        }}
      />
    </div>
  );
}
