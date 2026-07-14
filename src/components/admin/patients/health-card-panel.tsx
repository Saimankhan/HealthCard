"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/patient/status-badge";

type HealthCardSummary = {
  id: string;
  cardNumber: string;
  status: string;
  issuedAt: string;
  expiresAt: string | null;
} | null;

export function HealthCardPanel({
  patientId,
  healthCard,
}: {
  patientId: string;
  healthCard: HealthCardSummary;
}) {
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);

  async function handleIssue() {
    setIsBusy(true);
    try {
      await apiFetch("/api/health-cards", {
        method: "POST",
        body: JSON.stringify({ patientId }),
      });
      toast.success("HealthCard issued");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to issue card");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleReissue() {
    if (!healthCard) return;
    setIsBusy(true);
    try {
      await apiFetch(`/api/health-cards/${healthCard.id}/reissue`, {
        method: "POST",
        body: JSON.stringify({ newCardNumber: false }),
      });
      toast.success("HealthCard reissued — previous QR code is now invalid");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reissue card"
      );
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>HealthCard</CardTitle>
      </CardHeader>
      <CardContent>
        {healthCard ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground">Card number</p>
                <p className="font-mono font-medium">{healthCard.cardNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <StatusBadge status={healthCard.status} />
              </div>
              <div>
                <p className="text-muted-foreground">Expires</p>
                <p className="font-medium">
                  {healthCard.expiresAt
                    ? formatDate(healthCard.expiresAt)
                    : "No expiry"}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={handleReissue}
            >
              <RefreshCcw />
              Reissue
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">
              No HealthCard has been issued for this patient yet.
            </p>
            <Button size="sm" disabled={isBusy} onClick={handleIssue}>
              Issue HealthCard
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
