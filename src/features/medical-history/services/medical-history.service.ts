import "server-only";
import type { Session } from "@/core/auth/auth";
import { ForbiddenError, NotFoundError } from "@/core/api/errors";
import { paginationMeta, paginationSkipTake } from "@/core/api/pagination";
import { writeAuditLog } from "@/features/audit-logs/services/audit-log.service";
import * as medicalHistoryRepo from "@/features/medical-history/repository/medical-history.repository";
import * as patientRepo from "@/features/patients/repository/patient.repository";
import * as doctorRepo from "@/features/doctors/repository/doctor.repository";
import type {
  CreateMedicalHistoryInput,
  ListMedicalHistoryQuery,
  UpdateMedicalHistoryInput,
} from "@/features/medical-history/validation/medical-history.validation";

type MedicalHistoryRecord = NonNullable<
  Awaited<ReturnType<typeof medicalHistoryRepo.findMedicalHistoryById>>
>;

function assertReadAccess(session: Session, record: MedicalHistoryRecord) {
  const role = session.user.role;
  if (role === "ADMIN") return;
  if (role === "PATIENT" && record.patient.userId === session.user.id) return;
  if (role === "DOCTOR") return;
  throw new ForbiddenError();
}

function assertWriteAccess(session: Session, record: MedicalHistoryRecord) {
  const role = session.user.role;
  if (role === "ADMIN") return;
  if (role === "DOCTOR" && record.doctor?.userId === session.user.id) return;
  throw new ForbiddenError();
}

export async function listMedicalHistoryService(
  session: Session,
  query: ListMedicalHistoryQuery
) {
  const { skip, take } = paginationSkipTake(query);

  let patientId = query.patientId;
  const doctorId = query.doctorId;

  if (session.user.role === "PATIENT") {
    const patient = await patientRepo.findPatientByUserId(session.user.id);
    if (!patient) throw new NotFoundError("Patient profile");
    patientId = patient.id;
  } else if (session.user.role !== "ADMIN" && session.user.role !== "DOCTOR") {
    throw new ForbiddenError();
  }

  const { items, total } = await medicalHistoryRepo.listMedicalHistory({
    skip,
    take,
    sortOrder: query.sortOrder,
    patientId,
    doctorId,
  });

  return { items, meta: paginationMeta(query, total) };
}

export async function getMedicalHistoryByIdService(
  session: Session,
  id: string
) {
  const record = await medicalHistoryRepo.findMedicalHistoryById(id);
  if (!record) throw new NotFoundError("Medical history record");
  assertReadAccess(session, record);
  return record;
}

export async function createMedicalHistoryService(
  session: Session,
  input: CreateMedicalHistoryInput
) {
  if (session.user.role !== "DOCTOR" && session.user.role !== "ADMIN") {
    throw new ForbiddenError();
  }

  const patient = await patientRepo.findPatientById(input.patientId);
  if (!patient) throw new NotFoundError("Patient");

  let doctorId: string | undefined;
  if (session.user.role === "DOCTOR") {
    const doctor = await doctorRepo.findDoctorByUserId(session.user.id);
    if (!doctor) throw new NotFoundError("Doctor profile");
    doctorId = doctor.id;
  }

  const record = await medicalHistoryRepo.createMedicalHistory({
    patient: { connect: { id: input.patientId } },
    ...(doctorId ? { doctor: { connect: { id: doctorId } } } : {}),
    condition: input.condition,
    diagnosis: input.diagnosis,
    notes: input.notes,
    recordedAt: input.recordedAt,
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: "CREATE",
    entityType: "MedicalHistory",
    entityId: record.id,
  });

  return record;
}

export async function updateMedicalHistoryService(
  session: Session,
  id: string,
  input: UpdateMedicalHistoryInput
) {
  const record = await medicalHistoryRepo.findMedicalHistoryById(id);
  if (!record) throw new NotFoundError("Medical history record");
  assertWriteAccess(session, record);

  const updated = await medicalHistoryRepo.updateMedicalHistory(id, input);

  await writeAuditLog({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "MedicalHistory",
    entityId: id,
  });

  return updated;
}

export async function deleteMedicalHistoryService(
  session: Session,
  id: string
) {
  const record = await medicalHistoryRepo.findMedicalHistoryById(id);
  if (!record) throw new NotFoundError("Medical history record");
  assertWriteAccess(session, record);

  const deleted = await medicalHistoryRepo.softDeleteMedicalHistory(id);

  await writeAuditLog({
    actorId: session.user.id,
    action: "DELETE",
    entityType: "MedicalHistory",
    entityId: id,
  });

  return deleted;
}
