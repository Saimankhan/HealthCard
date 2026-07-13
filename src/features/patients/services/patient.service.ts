import "server-only";
import type { Session } from "@/core/auth/auth";
import { isAdminRole } from "@/core/auth/roles";
import { ForbiddenError, NotFoundError } from "@/core/api/errors";
import { paginationMeta, paginationSkipTake } from "@/core/api/pagination";
import { writeAuditLog } from "@/features/audit-logs/services/audit-log.service";
import { createHealthCard } from "@/features/healthcard/repository/health-card.repository";
import * as patientRepo from "@/features/patients/repository/patient.repository";
import type {
  CreatePatientInput,
  ListPatientsQuery,
  UpdatePatientInput,
} from "@/features/patients/validation/patient.validation";

type PatientRecord = NonNullable<
  Awaited<ReturnType<typeof patientRepo.findPatientById>>
>;

function assertReadAccess(session: Session, patient: PatientRecord) {
  const role = session.user.role;
  if (isAdminRole(role) || role === "DOCTOR") return;
  if (role === "PATIENT" && patient.userId === session.user.id) return;
  throw new ForbiddenError();
}

function assertWriteAccess(session: Session, patient: PatientRecord) {
  const role = session.user.role;
  if (isAdminRole(role)) return;
  if (role === "PATIENT" && patient.userId === session.user.id) return;
  throw new ForbiddenError();
}

export async function getPatientByIdService(session: Session, id: string) {
  const patient = await patientRepo.findPatientById(id);
  if (!patient) throw new NotFoundError("Patient");
  assertReadAccess(session, patient);
  return patient;
}

export async function getOwnPatientProfileService(session: Session) {
  const patient = await patientRepo.findPatientByUserId(session.user.id);
  if (!patient) throw new NotFoundError("Patient profile");
  return patient;
}

export async function listPatientsService(query: ListPatientsQuery) {
  const { skip, take } = paginationSkipTake(query);
  const { items, total } = await patientRepo.listPatients({
    skip,
    take,
    sortOrder: query.sortOrder,
    gender: query.gender,
    bloodGroup: query.bloodGroup,
    search: query.search,
  });
  return { items, meta: paginationMeta(query, total) };
}

export async function createPatientService(
  actorId: string,
  input: CreatePatientInput
) {
  const existing = await patientRepo.findPatientByUserId(input.userId);
  if (existing) {
    throw new ForbiddenError("A patient profile already exists for this user");
  }

  const patient = await patientRepo.createPatient({
    user: { connect: { id: input.userId } },
    dateOfBirth: input.dateOfBirth,
    gender: input.gender,
    bloodGroup: input.bloodGroup,
    phone: input.phone,
    address: input.address,
    emergencyContactName: input.emergencyContactName,
    emergencyContactPhone: input.emergencyContactPhone,
  });

  await createHealthCard(patient.id);

  await writeAuditLog({
    actorId,
    action: "CREATE",
    entityType: "Patient",
    entityId: patient.id,
  });

  return patient;
}

export async function updatePatientService(
  session: Session,
  id: string,
  input: UpdatePatientInput
) {
  const patient = await patientRepo.findPatientById(id);
  if (!patient) throw new NotFoundError("Patient");
  assertWriteAccess(session, patient);

  const updated = await patientRepo.updatePatient(id, input);

  await writeAuditLog({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "Patient",
    entityId: id,
  });

  return updated;
}

export async function deletePatientService(session: Session, id: string) {
  const patient = await patientRepo.findPatientById(id);
  if (!patient) throw new NotFoundError("Patient");
  if (!isAdminRole(session.user.role)) throw new ForbiddenError();

  const deleted = await patientRepo.softDeletePatient(id);

  await writeAuditLog({
    actorId: session.user.id,
    action: "DELETE",
    entityType: "Patient",
    entityId: id,
  });

  return deleted;
}
