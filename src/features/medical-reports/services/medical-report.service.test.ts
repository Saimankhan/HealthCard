import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/core/storage/storage", () => ({
  STORAGE_PREFIX: {
    medicalReports: "medical-reports",
    prescriptions: "prescriptions",
    profilePhotos: "profile-photos",
  },
  assertValidFileUpload: vi.fn(),
  getSignedDownloadUrl: vi.fn(),
  getSignedUploadUrl: vi
    .fn()
    .mockResolvedValue("https://signed.example/upload"),
}));
vi.mock("@/features/audit-logs/services/audit-log.service", () => ({
  writeAuditLog: vi.fn(),
}));
vi.mock("@/features/notifications/repository/notification.repository", () => ({
  createNotification: vi.fn(),
}));
vi.mock("@/features/medical-reports/repository/medical-report.repository");
vi.mock("@/features/patients/repository/patient.repository");
vi.mock("@/features/doctors/repository/doctor.repository");
vi.mock("@/features/appointments/repository/appointment.repository", () => ({
  existsAppointmentForDoctorAndPatient: vi.fn(),
}));
vi.mock("@/core/security/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
}));

import * as medicalReportRepo from "@/features/medical-reports/repository/medical-report.repository";
import * as patientRepo from "@/features/patients/repository/patient.repository";
import * as doctorRepo from "@/features/doctors/repository/doctor.repository";
import { existsAppointmentForDoctorAndPatient } from "@/features/appointments/repository/appointment.repository";
import { getSignedUploadUrl } from "@/core/storage/storage";
import {
  createMedicalReportService,
  requestUploadUrlService,
} from "@/features/medical-reports/services/medical-report.service";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/core/api/errors";
import { checkRateLimit } from "@/core/security/rate-limit";
import type { Session } from "@/core/auth/auth";

function makeSession(role: string, userId = "user-1"): Session {
  return { user: { id: userId, role } } as unknown as Session;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(patientRepo.findPatientById).mockResolvedValue({
    id: "patient-1",
    userId: "patient-user-1",
  } as never);
  vi.mocked(getSignedUploadUrl).mockResolvedValue(
    "https://signed.example/upload"
  );
  vi.mocked(checkRateLimit).mockResolvedValue(true);
});

describe("requestUploadUrlService — RBAC gates", () => {
  it("lets a patient request an upload URL for their own record", async () => {
    vi.mocked(patientRepo.findPatientByUserId).mockResolvedValue({
      id: "patient-1",
    } as never);

    const result = await requestUploadUrlService(
      makeSession("PATIENT", "patient-user-1"),
      {
        patientId: "patient-1",
        fileName: "scan.pdf",
        contentType: "application/pdf",
        fileSize: 1000,
      } as never
    );

    expect(result.fileKey).toMatch(/^medical-reports\/patient-1\//);
  });

  it("blocks a patient from requesting an upload URL for another patient", async () => {
    vi.mocked(patientRepo.findPatientByUserId).mockResolvedValue({
      id: "someone-elses-patient-id",
    } as never);

    await expect(
      requestUploadUrlService(makeSession("PATIENT", "patient-user-1"), {
        patientId: "patient-1",
        fileName: "scan.pdf",
        contentType: "application/pdf",
        fileSize: 1000,
      } as never)
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("requires a doctor to have treated the patient", async () => {
    vi.mocked(doctorRepo.findDoctorByUserId).mockResolvedValue({
      id: "doctor-1",
    } as never);
    vi.mocked(existsAppointmentForDoctorAndPatient).mockResolvedValue(false);

    await expect(
      requestUploadUrlService(makeSession("DOCTOR", "doctor-user-1"), {
        patientId: "patient-1",
        fileName: "scan.pdf",
        contentType: "application/pdf",
        fileSize: 1000,
      } as never)
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("allows an admin regardless of treatment history", async () => {
    const result = await requestUploadUrlService(makeSession("ADMIN"), {
      patientId: "patient-1",
      fileName: "scan.pdf",
      contentType: "application/pdf",
      fileSize: 1000,
    } as never);
    expect(result.uploadUrl).toBeTruthy();
  });
});

describe("createMedicalReportService — fileKey ownership (IDOR regression)", () => {
  it("rejects a fileKey that doesn't belong to the claimed patient", async () => {
    await expect(
      createMedicalReportService(makeSession("ADMIN"), {
        patientId: "patient-1",
        title: "Report",
        category: "OTHER",
        fileKey: "medical-reports/some-other-patient/evil.pdf",
      } as never)
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("rejects a fileKey pointing at a different storage category entirely", async () => {
    await expect(
      createMedicalReportService(makeSession("ADMIN"), {
        patientId: "patient-1",
        title: "Report",
        category: "OTHER",
        fileKey: "profile-photos/patient-1/avatar.jpg",
      } as never)
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("accepts a fileKey correctly scoped to the claimed patient", async () => {
    vi.mocked(medicalReportRepo.createMedicalReport).mockResolvedValue({
      id: "report-1",
    } as never);

    const report = await createMedicalReportService(makeSession("ADMIN"), {
      patientId: "patient-1",
      title: "Report",
      category: "OTHER",
      fileKey: "medical-reports/patient-1/legit-uuid-name.pdf",
    } as never);

    expect(report.id).toBe("report-1");
  });

  it("rejects when the patient doesn't exist", async () => {
    vi.mocked(patientRepo.findPatientById).mockResolvedValue(null);

    await expect(
      createMedicalReportService(makeSession("ADMIN"), {
        patientId: "missing-patient",
        title: "Report",
        category: "OTHER",
        fileKey: "medical-reports/missing-patient/x.pdf",
      } as never)
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
