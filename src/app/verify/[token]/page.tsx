import type { Metadata } from "next";
import { headers } from "next/headers";
import { CheckCircle2, Clock, ShieldAlert, XCircle } from "lucide-react";

import { getClientIp } from "@/core/security/rate-limit";
import {
  isPublicVerifyRateLimited,
  verifyHealthCardPublicService,
} from "@/features/healthcard/services/health-card.service";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Verify HealthCard" };

async function VerificationResult({ token }: { token: string }) {
  const result = await verifyHealthCardPublicService(token);

  if (result.valid) {
    return (
      <>
        <CheckCircle2 className="text-primary size-10" />
        <h1 className="text-lg font-semibold">Valid HealthCard</h1>
        <p className="text-muted-foreground text-sm">
          {result.patientFirstName}&apos;s HealthCard is active.
        </p>
        <dl className="mt-2 w-full space-y-1 rounded-lg border p-3 text-left text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Card number</dt>
            <dd className="font-mono">{result.cardNumber}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Issued</dt>
            <dd>{formatDate(result.issuedAt)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Expires</dt>
            <dd>{result.expiresAt ? formatDate(result.expiresAt) : "—"}</dd>
          </div>
        </dl>
      </>
    );
  }

  if (result.status === "NOT_FOUND") {
    return (
      <>
        <XCircle className="text-destructive size-10" />
        <h1 className="text-lg font-semibold">Invalid QR code</h1>
        <p className="text-muted-foreground text-sm">
          This HealthCard could not be found. It may have been mistyped or the
          link is broken.
        </p>
      </>
    );
  }

  const isExpired = result.status === "EXPIRED";
  return (
    <>
      {isExpired ? (
        <Clock className="text-muted-foreground size-10" />
      ) : (
        <XCircle className="text-destructive size-10" />
      )}
      <h1 className="text-lg font-semibold">
        HealthCard {isExpired ? "expired" : "revoked"}
      </h1>
      <p className="text-muted-foreground text-sm">
        Card {result.cardNumber} is no longer valid
        {isExpired && result.expiresAt
          ? ` (expired ${formatDate(result.expiresAt)})`
          : ""}
        .
      </p>
    </>
  );
}

export default async function VerifyHealthCardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ip = getClientIp(await headers());
  const rateLimited = await isPublicVerifyRateLimited(token, ip);

  return (
    <div className="bg-muted/40 flex flex-1 items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-sm">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            {rateLimited ? (
              <>
                <ShieldAlert className="text-muted-foreground size-10" />
                <h1 className="text-lg font-semibold">Too many attempts</h1>
                <p className="text-muted-foreground text-sm">
                  Please wait a while before trying to verify this card again.
                </p>
              </>
            ) : (
              <VerificationResult token={token} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
