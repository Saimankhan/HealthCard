import type { Metadata } from "next";

import { getCurrentSession } from "@/core/auth/rbac";
import { getOwnPatientProfileService } from "@/features/patients/services/patient.service";
import { MedicalReportsManager } from "@/components/patient/medical-reports/medical-reports-manager";

export const metadata: Metadata = { title: "Medical Reports - HealthCard" };

export default async function MedicalReportsPage() {
  const session = await getCurrentSession();
  if (!session) return null;

  const patient = await getOwnPatientProfileService(session);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Medical Reports</h1>
        <p className="text-muted-foreground text-sm">
          Upload, view, and manage your lab reports and medical documents.
        </p>
      </div>
      <MedicalReportsManager patientId={patient.id} />
    </div>
  );
}
