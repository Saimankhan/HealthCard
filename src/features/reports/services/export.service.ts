import "server-only";
import { BadRequestError } from "@/core/api/errors";
import * as patientRepo from "@/features/patients/repository/patient.repository";
import * as doctorRepo from "@/features/doctors/repository/doctor.repository";
import * as appointmentRepo from "@/features/appointments/repository/appointment.repository";
import * as paymentRepo from "@/features/payments/repository/payment.repository";
import * as medicalHistoryRepo from "@/features/medical-history/repository/medical-history.repository";
import * as reportRepo from "@/features/reports/repository/report.repository";
import { toCsv, type ExportColumn } from "@/lib/export/csv";
import { buildTablePdf } from "@/lib/export/pdf";
import { buildWorkbook } from "@/lib/export/excel";
import { formatEnumLabel } from "@/lib/format";

export type ExportFormat = "csv" | "pdf" | "xlsx";
export const EXPORT_DOMAINS = [
  "patients",
  "doctors",
  "appointments",
  "payments",
  "revenue",
  "medical-history",
] as const;
export type ExportDomain = (typeof EXPORT_DOMAINS)[number];

/** Bulk exports are staff-only and unfiltered — bounded so a runaway dataset can't hang the request. */
const EXPORT_ROW_LIMIT = 5000;

interface ExportData<T> {
  rows: T[];
  columns: ExportColumn<T>[];
}

/**
 * Each fetcher below keeps `rows`/`columns` strongly paired and typed
 * locally; this is the single spot where that pairing is erased to a common
 * `ExportData<unknown>` so all six domains can share one dispatch map.
 */
function toExportData<T>(
  rows: T[],
  columns: ExportColumn<T>[]
): ExportData<unknown> {
  return { rows, columns } as ExportData<unknown>;
}

async function fetchPatients(): Promise<ExportData<unknown>> {
  const { items } = await patientRepo.listPatients({
    skip: 0,
    take: EXPORT_ROW_LIMIT,
    sortOrder: "desc",
  });
  const columns: ExportColumn<(typeof items)[number]>[] = [
    { key: "name", header: "Name", value: (r) => r.user.name },
    { key: "email", header: "Email", value: (r) => r.user.email },
    { key: "phone", header: "Phone", value: (r) => r.phone },
    { key: "gender", header: "Gender", value: (r) => r.gender },
    { key: "bloodGroup", header: "Blood Group", value: (r) => r.bloodGroup },
    {
      key: "registered",
      header: "Registered",
      value: (r) => r.createdAt.toISOString().slice(0, 10),
    },
  ];
  return toExportData(items, columns);
}

async function fetchDoctors(): Promise<ExportData<unknown>> {
  const { items } = await doctorRepo.listDoctors({
    skip: 0,
    take: EXPORT_ROW_LIMIT,
    sortOrder: "asc",
  });
  const columns: ExportColumn<(typeof items)[number]>[] = [
    { key: "name", header: "Name", value: (r) => `Dr. ${r.user.name}` },
    { key: "email", header: "Email", value: (r) => r.user.email },
    { key: "license", header: "License Number", value: (r) => r.licenseNumber },
    {
      key: "specializations",
      header: "Specializations",
      value: (r) =>
        r.specializations.map((s) => s.specialization.name).join("; "),
    },
    {
      key: "experience",
      header: "Experience (yrs)",
      value: (r) => r.experienceYears,
    },
    {
      key: "fee",
      header: "Consultation Fee",
      value: (r) => r.consultationFee?.toString() ?? null,
    },
  ];
  return toExportData(items, columns);
}

async function fetchAppointments(): Promise<ExportData<unknown>> {
  const { items } = await appointmentRepo.listAppointments({
    skip: 0,
    take: EXPORT_ROW_LIMIT,
    sortOrder: "desc",
  });
  const columns: ExportColumn<(typeof items)[number]>[] = [
    { key: "patient", header: "Patient", value: (r) => r.patient.user.name },
    {
      key: "doctor",
      header: "Doctor",
      value: (r) => `Dr. ${r.doctor.user.name}`,
    },
    {
      key: "scheduledAt",
      header: "Scheduled At",
      value: (r) => r.scheduledAt.toISOString(),
    },
    {
      key: "duration",
      header: "Duration (min)",
      value: (r) => r.durationMinutes,
    },
    {
      key: "status",
      header: "Status",
      value: (r) => formatEnumLabel(r.status),
    },
    { key: "reason", header: "Reason", value: (r) => r.reason },
  ];
  return toExportData(items, columns);
}

async function fetchPayments(): Promise<ExportData<unknown>> {
  const { items } = await paymentRepo.listPayments({
    skip: 0,
    take: EXPORT_ROW_LIMIT,
    sortOrder: "desc",
  });
  const columns: ExportColumn<(typeof items)[number]>[] = [
    { key: "patient", header: "Patient", value: (r) => r.patient.user.name },
    { key: "amount", header: "Amount", value: (r) => r.amount.toString() },
    {
      key: "currency",
      header: "Currency",
      value: (r) => r.currency.toUpperCase(),
    },
    {
      key: "status",
      header: "Status",
      value: (r) => formatEnumLabel(r.status),
    },
    {
      key: "method",
      header: "Method",
      value: (r) => formatEnumLabel(r.method),
    },
    {
      key: "createdAt",
      header: "Date",
      value: (r) => r.createdAt.toISOString().slice(0, 10),
    },
  ];
  return toExportData(items, columns);
}

async function fetchRevenue(): Promise<ExportData<unknown>> {
  const since = new Date(0);
  const rows = await reportRepo.getRevenueByDay(since);
  const columns: ExportColumn<(typeof rows)[number]>[] = [
    {
      key: "date",
      header: "Date",
      value: (r) => r.day.toISOString().slice(0, 10),
    },
    { key: "total", header: "Revenue", value: (r) => Number(r.total) },
  ];
  return toExportData(rows, columns);
}

async function fetchMedicalHistory(): Promise<ExportData<unknown>> {
  const { items } = await medicalHistoryRepo.listMedicalHistory({
    skip: 0,
    take: EXPORT_ROW_LIMIT,
    sortOrder: "desc",
  });
  const columns: ExportColumn<(typeof items)[number]>[] = [
    { key: "patient", header: "Patient", value: (r) => r.patient.user.name },
    {
      key: "doctor",
      header: "Recorded By",
      value: (r) => (r.doctor ? `Dr. ${r.doctor.user.name}` : ""),
    },
    { key: "condition", header: "Condition", value: (r) => r.condition },
    { key: "diagnosis", header: "Diagnosis", value: (r) => r.diagnosis },
    {
      key: "recordedAt",
      header: "Recorded At",
      value: (r) => r.recordedAt.toISOString().slice(0, 10),
    },
  ];
  return toExportData(items, columns);
}

const EXPORTERS: Record<ExportDomain, () => Promise<ExportData<unknown>>> = {
  patients: fetchPatients,
  doctors: fetchDoctors,
  appointments: fetchAppointments,
  payments: fetchPayments,
  revenue: fetchRevenue,
  "medical-history": fetchMedicalHistory,
};

const CONTENT_TYPES: Record<ExportFormat, string> = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

export async function exportReportService(
  domain: ExportDomain,
  format: ExportFormat
): Promise<{ buffer: Buffer; contentType: string; extension: ExportFormat }> {
  const exporter = EXPORTERS[domain];
  if (!exporter) throw new BadRequestError("Unknown export domain");

  const { rows, columns } = await exporter();
  const title = formatEnumLabel(domain.replace("-", "_"));

  let buffer: Buffer;
  if (format === "csv") {
    buffer = Buffer.from(toCsv(rows, columns), "utf-8");
  } else if (format === "xlsx") {
    buffer = await buildWorkbook(title, columns, rows);
  } else if (format === "pdf") {
    buffer = buildTablePdf(title, columns, rows);
  } else {
    throw new BadRequestError("Unsupported export format");
  }

  return { buffer, contentType: CONTENT_TYPES[format], extension: format };
}
