import ExcelJS from "exceljs";

import type { ExportColumn } from "@/lib/export/csv";

export async function buildWorkbook<T>(
  sheetName: string,
  columns: ExportColumn<T>[],
  rows: T[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31));

  sheet.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: 22,
  }));
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow(
      Object.fromEntries(columns.map((c) => [c.key, c.value(row) ?? ""]))
    );
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
