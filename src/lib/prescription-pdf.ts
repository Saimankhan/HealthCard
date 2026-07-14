import type { PrescriptionListItem } from "@/components/patient/prescriptions/types";
import { formatDate } from "@/lib/format";

export async function downloadPrescriptionPdf(
  prescription: PrescriptionListItem
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 48;
  let y = 56;

  doc.setFontSize(18);
  doc.text("HealthCard", marginX, y);
  doc.setFontSize(11);
  doc.text("Digital Prescription", marginX, (y += 18));

  y += 24;
  doc.setDrawColor(200);
  doc.line(marginX, y, 547, y);

  y += 28;
  doc.setFontSize(10);
  doc.text(`Issued: ${formatDate(prescription.issuedAt)}`, marginX, y);

  y += 22;
  doc.setFontSize(12);
  doc.text("Patient", marginX, y);
  doc.setFontSize(10);
  doc.text(prescription.patient.user.name, marginX, (y += 16));
  doc.text(prescription.patient.user.email, marginX, (y += 14));

  y += 22;
  doc.setFontSize(12);
  doc.text("Prescribing doctor", marginX, y);
  doc.setFontSize(10);
  doc.text(`Dr. ${prescription.doctor.user.name}`, marginX, (y += 16));
  doc.text(`License: ${prescription.doctor.licenseNumber}`, marginX, (y += 14));

  y += 28;
  doc.setFontSize(12);
  doc.text("Medications", marginX, y);
  y += 8;

  for (const med of prescription.medications) {
    y += 20;
    if (y > 760) {
      doc.addPage();
      y = 56;
    }
    doc.setFontSize(11);
    doc.text(`- ${med.name}`, marginX, y);
    doc.setFontSize(9);
    const details = [
      med.dosage,
      med.frequency,
      med.durationDays ? `${med.durationDays} day(s)` : null,
    ]
      .filter(Boolean)
      .join(" | ");
    doc.text(details, marginX + 14, (y += 13));
  }

  if (prescription.notes) {
    y += 28;
    doc.setFontSize(12);
    doc.text("Notes", marginX, y);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(prescription.notes, 500);
    doc.text(lines, marginX, (y += 16));
  }

  doc.save(`prescription-${prescription.id.slice(0, 8)}.pdf`);
}
