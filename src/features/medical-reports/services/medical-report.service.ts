import "server-only";
import { randomUUID } from "node:crypto";
import type { Session } from "@/core/auth/auth";
import { isAdminRole } from "@/core/auth/roles";
import { ForbiddenError, NotFoundError } from "@/core/api/errors";
import { paginationMeta, paginationSkipTake } from "@/core/api/pagination";
import {
  assertValidFileUpload,
  getSignedDownloadUrl,
  getSignedUploadUrl,
  STORAGE_PREFIX,
} from "@/core/storage/storage";
import { writeAuditLog } from "@/features/audit-logs/services/audit-log.service";
import { createNotification } from "@/features/notifications/repository/notification.repository";
import * as medicalReportRepo from "@/features/medical-reports/repository/medical-report.repository";
import * as patientRepo from "@/features/patients/repository/patient.repository";
import * as doctorRepo from "@/features/doctors/repository/doctor.repository";
import { existsAppointmentForDoctorAndPatient } from "@/features/appointments/repository/appointment.repository";
import type {
  CreateMedicalReportInput,
  ListMedicalReportsQuery,
  RequestUploadUrlInput,
  UpdateMedicalReportInput,
} from "@/features/medical-reports/validation/medical-report.validation";

type MedicalReportRecord = NonNullable<
  Awaited<ReturnType<typeof medicalReportRepo.findMedicalReportById>>
>;

async function assertReadAccess(session: Session, report: MedicalReportRecord) {
  const role = session.user.role;
  if (isAdminRole(role)) return;
  if (role === "PATIENT" && report.patient.userId === session.user.id) return;
  if (role === "DOCTOR") {
    if (report.doctor?.userId === session.user.id) return;
    const doctor = await doctorRepo.findDoctorByUserId(session.user.id);
    if (
      doctor &&
      (await existsAppointmentForDoctorAndPatient(doctor.id, report.patientId))
    ) {
      return;
    }
  }
  throw new ForbiddenError();
}

function assertWriteAccess(session: Session, report: MedicalReportRecord) {
  const role = session.user.role;
  if (isAdminRole(role)) return;
  if (role === "DOCTOR" && report.doctor?.userId === session.user.id) return;
  if (role === "PATIENT" && report.patient.userId === session.user.id) return;
  throw new ForbiddenError();
}

export async function requestUploadUrlService(
  session: Session,
  input: RequestUploadUrlInput
) {
  if (session.user.role === "PATIENT") {
    const patient = await patientRepo.findPatientByUserId(session.user.id);
    if (!patient || patient.id !== input.patientId) throw new ForbiddenError();
  } else if (session.user.role === "DOCTOR") {
    const doctor = await doctorRepo.findDoctorByUserId(session.user.id);
    if (!doctor) throw new NotFoundError("Doctor profile");
    const assigned = await existsAppointmentForDoctorAndPatient(
      doctor.id,
      input.patientId
    );
    if (!assigned) throw new ForbiddenError();
  } else if (!isAdminRole(session.user.role)) {
    throw new ForbiddenError();
  }

  const patient = await patientRepo.findPatientById(input.patientId);
  if (!patient) throw new NotFoundError("Patient");

  assertValidFileUpload("medicalReports", input.contentType, input.fileSize);

  const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileKey = `${STORAGE_PREFIX.medicalReports}/${input.patientId}/${randomUUID()}-${safeFileName}`;

  const uploadUrl = await getSignedUploadUrl(fileKey, input.contentType);

  return { uploadUrl, fileKey };
}

export async function listMedicalReportsService(
  session: Session,
  query: ListMedicalReportsQuery
) {
  const { skip, take } = paginationSkipTake(query);

  let patientId = query.patientId;
  let doctorId = query.doctorId;

  if (session.user.role === "PATIENT") {
    const patient = await patientRepo.findPatientByUserId(session.user.id);
    if (!patient) throw new NotFoundError("Patient profile");
    patientId = patient.id;
  } else if (session.user.role === "DOCTOR") {
    const doctor = await doctorRepo.findDoctorByUserId(session.user.id);
    if (!doctor) throw new NotFoundError("Doctor profile");
    if (patientId) {
      const assigned = await existsAppointmentForDoctorAndPatient(
        doctor.id,
        patientId
      );
      if (!assigned) throw new ForbiddenError();
    } else {
      doctorId = doctor.id;
    }
  } else if (!isAdminRole(session.user.role)) {
    throw new ForbiddenError();
  }

  const { items, total } = await medicalReportRepo.listMedicalReports({
    skip,
    take,
    sortOrder: query.sortOrder,
    patientId,
    doctorId,
    category: query.category,
  });

  return { items, meta: paginationMeta(query, total) };
}

export async function getMedicalReportByIdService(
  session: Session,
  id: string
) {
  const report = await medicalReportRepo.findMedicalReportById(id);
  if (!report) throw new NotFoundError("Medical report");
  await assertReadAccess(session, report);

  const downloadUrl = await getSignedDownloadUrl(report.fileKey);
  return { ...report, downloadUrl };
}

export async function createMedicalReportService(
  session: Session,
  input: CreateMedicalReportInput
) {
  let doctorId: string | undefined;
  if (session.user.role === "PATIENT") {
    const patient = await patientRepo.findPatientByUserId(session.user.id);
    if (!patient || patient.id !== input.patientId) throw new ForbiddenError();
  } else if (session.user.role === "DOCTOR") {
    const doctor = await doctorRepo.findDoctorByUserId(session.user.id);
    if (!doctor) throw new NotFoundError("Doctor profile");
    const assigned = await existsAppointmentForDoctorAndPatient(
      doctor.id,
      input.patientId
    );
    if (!assigned) throw new ForbiddenError();
    doctorId = doctor.id;
  } else if (!isAdminRole(session.user.role)) {
    throw new ForbiddenError();
  }

  const patient = await patientRepo.findPatientById(input.patientId);
  if (!patient) throw new NotFoundError("Patient");

  const report = await medicalReportRepo.createMedicalReport({
    patient: { connect: { id: input.patientId } },
    ...(doctorId ? { doctor: { connect: { id: doctorId } } } : {}),
    title: input.title,
    category: input.category,
    fileKey: input.fileKey,
    fileType: input.fileType,
    fileSize: input.fileSize,
  });

  await createNotification({
    userId: patient.userId,
    type: "MEDICAL_REPORT_READY",
    title: "New medical report available",
    message: `A new report "${report.title}" has been added to your records.`,
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: "CREATE",
    entityType: "MedicalReport",
    entityId: report.id,
  });

  return report;
}

export async function updateMedicalReportService(
  session: Session,
  id: string,
  input: UpdateMedicalReportInput
) {
  const report = await medicalReportRepo.findMedicalReportById(id);
  if (!report) throw new NotFoundError("Medical report");
  assertWriteAccess(session, report);

  if (input.fileKey && input.fileType) {
    assertValidFileUpload("medicalReports", input.fileType, input.fileSize);
  }

  const updated = await medicalReportRepo.updateMedicalReport(id, input);

  await writeAuditLog({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "MedicalReport",
    entityId: id,
  });

  return updated;
}

export async function deleteMedicalReportService(session: Session, id: string) {
  const report = await medicalReportRepo.findMedicalReportById(id);
  if (!report) throw new NotFoundError("Medical report");
  assertWriteAccess(session, report);

  const deleted = await medicalReportRepo.softDeleteMedicalReport(id);

  await writeAuditLog({
    actorId: session.user.id,
    action: "DELETE",
    entityType: "MedicalReport",
    entityId: id,
  });

  return deleted;
}
