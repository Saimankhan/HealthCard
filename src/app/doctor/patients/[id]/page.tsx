import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { getCurrentSession } from "@/core/auth/rbac";
import { getPatientByIdService } from "@/features/patients/services/patient.service";
import { listMedicalHistoryService } from "@/features/medical-history/services/medical-history.service";
import { listMedicalHistoryQuerySchema } from "@/features/medical-history/validation/medical-history.validation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/patient/section-card";
import { MedicalReportsManager } from "@/components/patient/medical-reports/medical-reports-manager";
import { AddMedicalHistoryForm } from "@/components/doctor/patients/add-medical-history-form";
import { EditMedicalHistoryForm } from "@/components/doctor/patients/edit-medical-history-form";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Patient - HealthCard" };

export default async function DoctorPatientDetailPage({
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

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        render={
          <Link href="/doctor/patients">
            <ArrowLeft />
            Back to patients
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{patient.user.name}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Email</p>
            <p className="font-medium">{patient.user.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Phone</p>
            <p className="font-medium">{patient.phone ?? "-"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Gender</p>
            <p className="font-medium">{patient.gender ?? "-"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Blood group</p>
            <p className="font-medium">
              {patient.bloodGroup?.replace("_", " ") ?? "-"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Address</p>
            <p className="font-medium">{patient.address ?? "-"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Emergency contact</p>
            <p className="font-medium">
              {patient.emergencyContactName
                ? `${patient.emergencyContactName} (${patient.emergencyContactPhone ?? "-"})`
                : "-"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Medical History</CardTitle>
          <AddMedicalHistoryForm patientId={patient.id} />
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
                    <div className="flex items-center gap-2">
                      <p className="text-muted-foreground text-xs">
                        {formatDate(entry.recordedAt)}
                      </p>
                      {entry.doctor?.userId === session.user.id && (
                        <EditMedicalHistoryForm
                          entry={{
                            id: entry.id,
                            condition: entry.condition,
                            diagnosis: entry.diagnosis,
                            notes: entry.notes,
                          }}
                        />
                      )}
                    </div>
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
