"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { downloadPrescriptionPdf } from "@/lib/prescription-pdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import type { PrescriptionListItem } from "@/components/patient/prescriptions/types";

export function PrescriptionDetail({ id }: { id: string }) {
  const [prescription, setPrescription] = useState<PrescriptionListItem | null>(
    null
  );
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    apiFetch<PrescriptionListItem>(`/api/prescriptions/${id}`)
      .then(setPrescription)
      .catch(() => setNotFound(true));
  }, [id]);

  if (notFound) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground text-sm">
            Prescription not found.
          </p>
          <Button
            className="mt-4"
            render={
              <Link href="/patient/prescriptions">Back to prescriptions</Link>
            }
          />
        </CardContent>
      </Card>
    );
  }

  if (!prescription) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          render={
            <Link href="/patient/prescriptions">
              <ArrowLeft />
              Back to prescriptions
            </Link>
          }
        />
        <Button onClick={() => downloadPrescriptionPdf(prescription)}>
          <Download />
          Download PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prescription</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Prescribing doctor</p>
              <p className="font-medium">Dr. {prescription.doctor.user.name}</p>
              <p className="text-muted-foreground">
                License: {prescription.doctor.licenseNumber}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Issued</p>
              <p className="font-medium">{formatDate(prescription.issuedAt)}</p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="mb-2 font-medium">Medications</p>
            <div className="flex flex-col gap-3">
              {prescription.medications.map((med, i) => (
                <div key={i} className="bg-muted/50 rounded-lg p-3">
                  <p className="font-medium">{med.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {med.dosage} &middot; {med.frequency}
                    {med.durationDays ? ` · ${med.durationDays} day(s)` : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {prescription.notes && (
            <>
              <Separator />
              <div>
                <p className="text-muted-foreground">Notes</p>
                <p>{prescription.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
