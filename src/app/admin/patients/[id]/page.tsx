import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { getCurrentSession } from "@/core/auth/rbac";
import { getPatientByIdService } from "@/features/patients/services/patient.service";
import { getHealthCardByPatientIdService } from "@/features/healthcard/services/health-card.service";
import { listMedicalHistoryService } from "@/features/medical-history/services/medical-history.service";
import { listMedicalHistoryQuerySchema } from "@/features/medical-history/validation/medical-history.validation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/patient/section-card";
import { MedicalReportsManager } from "@/components/patient/medical-reports/medical-reports-manager";
import { EditPatientForm } from "@/components/admin/patients/edit-patient-form";
import { HealthCardPanel } from "@/components/admin/patients/health-card-panel";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Patient - HealthCard Admin" };

export default async function AdminPatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) return null;

  const { id } = await params;

  const patient = await getPatientByIdService(session, id).catch(() => null);
  if (!patient) {
    notFound();
  }

  const { items: history } = await listMedicalHistoryService(
    session,
    listMedicalHistoryQuerySchema.parse({
      patientId: id,
      page: 1,
      pageSize: 50,
      sortOrder: "desc",
    })
  );

  const healthCard = await getHealthCardByPatientIdService(session, patient.id);

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        render={
          <Link href="/admin/patients">
            <ArrowLeft />
            Back to patients
          </Link>
        }
      />

      <div>
        <h1 className="text-2xl font-semibold">{patient.user.name}</h1>
        <p className="text-muted-foreground text-sm">{patient.user.email}</p>
      </div>

      <EditPatientForm
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
      />

      <HealthCardPanel
        patientId={patient.id}
        healthCard={
          healthCard
            ? {
                id: healthCard.id,
                cardNumber: healthCard.cardNumber,
                status: healthCard.status,
                issuedAt: healthCard.issuedAt.toISOString(),
                expiresAt: healthCard.expiresAt
                  ? healthCard.expiresAt.toISOString()
                  : null,
              }
            : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Complete Medical History</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <EmptyState message="No medical history recorded yet." />
          ) : (
            <div className="flex flex-col gap-3">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="border-b pb-3 text-sm last:border-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{entry.condition}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatDate(entry.recordedAt)}
                    </p>
                  </div>
                  {entry.diagnosis && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Diagnosis: </span>
                      {entry.diagnosis}
                    </p>
                  )}
                  {entry.notes && (
                    <p className="text-muted-foreground text-sm">
                      {entry.notes}
                    </p>
                  )}
                  {entry.doctor && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Recorded by Dr. {entry.doctor.user.name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <MedicalReportsManager patientId={patient.id} />
        </CardContent>
      </Card>
    </div>
  );
}
