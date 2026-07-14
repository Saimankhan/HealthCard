import { jsPDF } from "jspdf";

import { formatDate, formatEnumLabel } from "@/lib/format";

export interface HealthCardPdfData {
  cardNumber: string;
  status: string;
  patientName: string;
  bloodGroup?: string | null;
  dateOfBirth?: string | Date | null;
  issuedAt: string | Date;
  expiresAt: string | Date | null;
  qrImageUrl: string;
}

function formatBloodGroup(value: string): string {
  return formatEnumLabel(value)
    .replace(" Positive", "+")
    .replace(" Negative", "-");
}

async function loadImageAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load QR image");
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function downloadHealthCardPdf(card: HealthCardPdfData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 48;
  let y = 56;

  doc.setFontSize(18);
  doc.text("HealthCard", marginX, y);
  doc.setFontSize(11);
  doc.text("Digital Health Card", marginX, (y += 18));

  y += 24;
  doc.setDrawColor(200);
  doc.line(marginX, y, 547, y);

  y += 28;
  doc.setFontSize(12);
  doc.text("Card Number", marginX, y);
  doc.setFontSize(14);
  doc.text(card.cardNumber, marginX, (y += 18));

  y += 20;
  doc.setFontSize(10);
  doc.text(`Status: ${formatEnumLabel(card.status)}`, marginX, y);

  y += 24;
  doc.setFontSize(12);
  doc.text("Patient", marginX, y);
  doc.setFontSize(10);
  doc.text(card.patientName, marginX, (y += 16));
  if (card.bloodGroup) {
    doc.text(
      `Blood Group: ${formatBloodGroup(card.bloodGroup)}`,
      marginX,
      (y += 14)
    );
  }
  if (card.dateOfBirth) {
    doc.text(
      `Date of Birth: ${formatDate(card.dateOfBirth)}`,
      marginX,
      (y += 14)
    );
  }

  y += 22;
  doc.setFontSize(10);
  doc.text(`Issued: ${formatDate(card.issuedAt)}`, marginX, y);
  doc.text(
    `Expires: ${card.expiresAt ? formatDate(card.expiresAt) : "No expiry"}`,
    marginX,
    (y += 14)
  );

  try {
    const qrDataUrl = await loadImageAsDataUrl(card.qrImageUrl);
    doc.addImage(qrDataUrl, "PNG", 400, 56, 140, 140);
    doc.setFontSize(8);
    doc.text("Scan to verify", 400, 210);
  } catch {
    // QR embed is best-effort; the PDF is still useful without it.
  }

  doc.save(`healthcard-${card.cardNumber}.pdf`);
}
