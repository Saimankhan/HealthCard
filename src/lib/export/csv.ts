export interface ExportColumn<T> {
  key: string;
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
}

function escapeCsvValue(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv<T>(rows: T[], columns: ExportColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvValue(c.header)).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsvValue(c.value(row))).join(",")
  );
  return [header, ...lines].join("\r\n");
}
