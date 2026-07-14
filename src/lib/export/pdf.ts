import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import type { ExportColumn } from "@/lib/export/csv";

export function buildTablePdf<T>(
  title: string,
  columns: ExportColumn<T>[],
  rows: T[]
): Buffer {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.setFontSize(14);
  doc.text(title, 40, 40);
  doc.setFontSize(9);
  doc.text(`Generated ${new Date().toLocaleString()}`, 40, 56);

  autoTable(doc, {
    startY: 68,
    head: [columns.map((c) => c.header)],
    body: rows.map((row) =>
      columns.map((c) => {
        const value = c.value(row);
        return value === null || value === undefined ? "" : String(value);
      })
    ),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [30, 41, 59] },
  });

  return Buffer.from(doc.output("arraybuffer"));
}
