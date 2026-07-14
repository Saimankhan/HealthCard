"use client";

import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { downloadHealthCardPdf } from "@/lib/healthcard-pdf";

export function HealthCardActions({
  cardNumber,
  status,
  patientName,
  bloodGroup,
  dateOfBirth,
  issuedAt,
  expiresAt,
}: {
  cardNumber: string;
  status: string;
  patientName: string;
  bloodGroup?: string | null;
  dateOfBirth?: string | Date | null;
  issuedAt: string | Date;
  expiresAt: string | Date | null;
}) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadHealthCardPdf({
        cardNumber,
        status,
        patientName,
        bloodGroup,
        dateOfBirth,
        issuedAt,
        expiresAt,
        qrImageUrl: "/api/health-cards/me/qr",
      });
    } catch {
      toast.error("Could not generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button onClick={handleDownload} disabled={downloading}>
        <Download />
        {downloading ? "Preparing…" : "Download PDF"}
      </Button>
      <Button variant="outline" onClick={() => window.print()}>
        <Printer />
        Print
      </Button>
    </div>
  );
}
