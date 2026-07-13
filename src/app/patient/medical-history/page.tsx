import Link from "next/link";
import type { Metadata } from "next";
import { FolderOpen } from "lucide-react";

import { getCurrentSession } from "@/core/auth/rbac";
import { listMedicalHistoryService } from "@/features/medical-history/services/medical-history.service";
import { listMedicalHistoryQuerySchema } from "@/features/medical-history/validation/medical-history.validation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/patient/section-card";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Medical History - HealthCard" };

export default async function MedicalHistoryPage() {
  const session = await getCurrentSession();
  if (!session) return null;

  const { items } = await listMedicalHistoryService(
    session,
    listMedicalHistoryQuerySchema.parse({
      page: 1,
      pageSize: 50,
      sortOrder: "desc",
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Medical History</h1>
          <p className="text-muted-foreground text-sm">
            Diagnosis and treatment history recorded by your doctors.
          </p>
        </div>
        <Button
          variant="outline"
          render={
            <Link href="/patient/medical-reports">
              <FolderOpen />
              Lab reports &amp; documents
            </Link>
          }
        />
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState message="No medical history recorded yet." />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="flex flex-col gap-1 py-4">
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
                  <p className="text-muted-foreground text-sm">{entry.notes}</p>
                )}
                {entry.doctor && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Recorded by Dr. {entry.doctor.user.name}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
