import "server-only";
import type { Session } from "@/core/auth/auth";
import { isAdminRole } from "@/core/auth/roles";
import { ForbiddenError, NotFoundError } from "@/core/api/errors";
import { paginationMeta, paginationSkipTake } from "@/core/api/pagination";
import { CACHE_TTL, getOrSetCache, invalidateCache } from "@/core/cache/cache";
import { writeAuditLog } from "@/features/audit-logs/services/audit-log.service";
import * as medicalHistoryRepo from "@/features/medical-history/repository/medical-history.repository";
import * as patientRepo from "@/features/patients/repository/patient.repository";
import * as doctorRepo from "@/features/doctors/repository/doctor.repository";
import { existsAppointmentForDoctorAndPatient } from "@/features/appointments/repository/appointment.repository";
import type {
  CreateMedicalHistoryInput,
  ListMedicalHistoryQuery,
  UpdateMedicalHistoryInput,
} from "@/features/medical-history/validation/medical-history.validation";

type MedicalHistoryRecord = NonNullable<
  Awaited<ReturnType<typeof medicalHistoryRepo.findMedicalHistoryById>>
>;

async function assertReadAccess(
  session: Session,
  record: MedicalHistoryRecord
) {
  const role = session.user.role;
  if (isAdminRole(role)) return;
  if (role === "PATIENT" && record.patient.userId === session.user.id) return;
  if (role === "DOCTOR") {
    if (record.doctor?.userId === session.user.id) return;
    const doctor = await doctorRepo.findDoctorByUserId(session.user.id);
    if (
      doctor &&
      (await existsAppointmentForDoctorAndPatient(doctor.id, record.patientId))
    ) {
      return;
    }
  }
  throw new ForbiddenError();
}

function assertWriteAccess(session: Session, record: MedicalHistoryRecord) {
  const role = session.user.role;
  if (isAdminRole(role)) return;
  if (role === "DOCTOR" && record.doctor?.userId === session.user.id) return;
  throw new ForbiddenError();
}

/**
 * Every real call site (patient/doctor/admin detail pages, dashboards)
 * fixes page=1 and sortOrder="desc" — only pageSize varies (3/5/50) between
 * dashboard previews and full-history views — so caching keys off patientId
 * + doctorId + pageSize covers all of them without an unbounded key space.
 */
function medicalHistoryCacheKey(
  patientId: string | undefined,
  doctorId: string | undefined,
  pageSize: number
) {
  return `cache:medical-history:${patientId ?? "any"}:${doctorId ?? "any"}:${pageSize}`;
}

function isCacheableMedicalHistoryQuery(query: ListMedicalHistoryQuery) {
  return query.page === 1 && query.sortOrder === "desc";
}

const MEDICAL_HISTORY_PAGE_SIZES = [3, 5, 50] as const;

async function invalidateMedicalHistoryCaches(
  patientId: string | undefined,
  doctorId?: string
) {
  const keys = MEDICAL_HISTORY_PAGE_SIZES.flatMap((pageSize) => [
    medicalHistoryCacheKey(patientId, undefined, pageSize),
    ...(doctorId
      ? [medicalHistoryCacheKey(patientId, doctorId, pageSize)]
      : []),
  ]);
  await invalidateCache(...keys);
}

export async function listMedicalHistoryService(
  session: Session,
  query: ListMedicalHistoryQuery
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

  const fetcher = async () => {
    const { items, total } = await medicalHistoryRepo.listMedicalHistory({
      skip,
      take,
      sortOrder: query.sortOrder,
      patientId,
      doctorId,
    });
    return { items, meta: paginationMeta(query, total) };
  };

  if (isCacheableMedicalHistoryQuery(query)) {
    return getOrSetCache(
      medicalHistoryCacheKey(patientId, doctorId, query.pageSize),
      CACHE_TTL.medicalHistory,
      fetcher
    );
  }
  return fetcher();
}

export async function getMedicalHistoryByIdService(
  session: Session,
  id: string
) {
  const record = await medicalHistoryRepo.findMedicalHistoryById(id);
  if (!record) throw new NotFoundError("Medical history record");
  await assertReadAccess(session, record);
  return record;
}

export async function createMedicalHistoryService(
  session: Session,
  input: CreateMedicalHistoryInput
) {
  if (session.user.role !== "DOCTOR" && !isAdminRole(session.user.role)) {
    throw new ForbiddenError();
  }

  const patient = await patientRepo.findPatientById(input.patientId);
  if (!patient) throw new NotFoundError("Patient");

  let doctorId: string | undefined;
  if (session.user.role === "DOCTOR") {
    const doctor = await doctorRepo.findDoctorByUserId(session.user.id);
    if (!doctor) throw new NotFoundError("Doctor profile");
    const assigned = await existsAppointmentForDoctorAndPatient(
      doctor.id,
      input.patientId
    );
    if (!assigned) throw new ForbiddenError();
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
  await invalidateMedicalHistoryCaches(input.patientId, doctorId);

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
  await invalidateMedicalHistoryCaches(
    record.patientId,
    record.doctorId ?? undefined
  );

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
  await invalidateMedicalHistoryCaches(
    record.patientId,
    record.doctorId ?? undefined
  );

  await writeAuditLog({
    actorId: session.user.id,
    action: "DELETE",
    entityType: "MedicalHistory",
    entityId: id,
  });

  return deleted;
}
