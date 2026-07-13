import type { Metadata } from "next";
import { QrCode } from "lucide-react";

import { getCurrentSession } from "@/core/auth/rbac";
import { getOwnPatientProfileService } from "@/features/patients/services/patient.service";
import { getOwnHealthCardService } from "@/features/healthcard/services/health-card.service";

import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/patient/status-badge";
import { formatDate, formatEnumLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Health Card - HealthCard" };

export default async function HealthCardPage() {
  const session = await getCurrentSession();
  if (!session) return null;

  const patient = await getOwnPatientProfileService(session);
  const healthCard = await getOwnHealthCardService(session).catch(() => null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Digital Health Card</h1>
        <p className="text-muted-foreground text-sm">
          Your official HealthCard identification.
        </p>
      </div>

      <div className="from-primary to-primary/70 text-primary-foreground relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 shadow-lg sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs tracking-widest uppercase opacity-80">
              HealthCard
            </p>
            <h2 className="mt-1 text-xl font-semibold">{session.user.name}</h2>
            <p className="mt-4 font-mono text-lg tracking-wider">
              {healthCard?.cardNumber ?? "Not issued"}
            </p>
            <div className="mt-4 flex flex-wrap gap-6 text-sm">
              <div>
                <p className="opacity-70">Blood Group</p>
                <p className="font-medium">
                  {patient.bloodGroup
                    ? formatEnumLabel(patient.bloodGroup)
                        .replace(" Positive", "+")
                        .replace(" Negative", "-")
                    : "Not set"}
                </p>
              </div>
              <div>
                <p className="opacity-70">Date of Birth</p>
                <p className="font-medium">
                  {patient.dateOfBirth
                    ? formatDate(patient.dateOfBirth)
                    : "Not set"}
                </p>
              </div>
              {healthCard?.expiresAt && (
                <div>
                  <p className="opacity-70">Expires</p>
                  <p className="font-medium">
                    {formatDate(healthCard.expiresAt)}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex size-24 items-center justify-center rounded-lg bg-white/15">
              <QrCode className="size-12 opacity-70" />
            </div>
            <p className="text-xs opacity-70">QR coming soon</p>
          </div>
        </div>
        {healthCard && (
          <div className="mt-6">
            <StatusBadge status={healthCard.status} />
          </div>
        )}
      </div>

      <Card>
        <CardContent className="grid gap-4 py-6 sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-sm">Full name</p>
            <p className="font-medium">{session.user.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Phone</p>
            <p className="font-medium">{patient.phone || "Not set"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground text-sm">Address</p>
            <p className="font-medium">{patient.address || "Not set"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-6">
          <h3 className="mb-3 font-semibold">Emergency Information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-sm">Contact name</p>
              <p className="font-medium">
                {patient.emergencyContactName || "Not set"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Contact phone</p>
              <p className="font-medium">
                {patient.emergencyContactPhone || "Not set"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
