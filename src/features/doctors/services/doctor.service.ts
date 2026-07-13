import "server-only";
import type { Session } from "@/core/auth/auth";
import { isAdminRole } from "@/core/auth/roles";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/core/api/errors";
import { paginationMeta, paginationSkipTake } from "@/core/api/pagination";
import { writeAuditLog } from "@/features/audit-logs/services/audit-log.service";
import * as doctorRepo from "@/features/doctors/repository/doctor.repository";
import * as userRepo from "@/features/users/repository/user.repository";
import * as patientRepo from "@/features/patients/repository/patient.repository";
import type {
  CreateDoctorInput,
  ListDoctorsQuery,
  UpdateDoctorInput,
} from "@/features/doctors/validation/doctor.validation";

export async function listDoctorsService(query: ListDoctorsQuery) {
  const { skip, take } = paginationSkipTake(query);
  const { items, total } = await doctorRepo.listDoctors({
    skip,
    take,
    sortOrder: query.sortOrder,
    specializationId: query.specializationId,
    search: query.search,
  });
  return { items, meta: paginationMeta(query, total) };
}

export async function getDoctorByIdService(id: string) {
  const doctor = await doctorRepo.findDoctorById(id);
  if (!doctor) throw new NotFoundError("Doctor");
  return doctor;
}

export async function getOwnDoctorProfileService(session: Session) {
  const doctor = await doctorRepo.findDoctorByUserId(session.user.id);
  if (!doctor) throw new NotFoundError("Doctor profile");
  return doctor;
}

export async function createDoctorService(
  actorId: string,
  input: CreateDoctorInput
) {
  const user = await userRepo.findUserById(input.userId);
  if (!user) throw new NotFoundError("User");

  const existingDoctor = await doctorRepo.findDoctorByUserId(input.userId);
  if (existingDoctor) {
    throw new ConflictError("A doctor profile already exists for this user");
  }

  if (!isAdminRole(user.role) && user.role !== "DOCTOR") {
    await userRepo.updateUser(user.id, { role: "DOCTOR" });
  }

  const existingPatient = await patientRepo.findPatientByUserId(input.userId);
  if (existingPatient) {
    await patientRepo.softDeletePatient(existingPatient.id);
  }

  const doctor = await doctorRepo.createDoctor(
    {
      user: { connect: { id: input.userId } },
      licenseNumber: input.licenseNumber,
      bio: input.bio,
      experienceYears: input.experienceYears,
      consultationFee: input.consultationFee,
      phone: input.phone,
    },
    input.specializationIds ?? []
  );

  await writeAuditLog({
    actorId,
    action: "CREATE",
    entityType: "Doctor",
    entityId: doctor.id,
  });

  return doctor;
}

function assertWriteAccess(session: Session, doctor: { userId: string }) {
  if (isAdminRole(session.user.role)) return;
  if (session.user.role === "DOCTOR" && doctor.userId === session.user.id)
    return;
  throw new ForbiddenError();
}

export async function updateDoctorService(
  session: Session,
  id: string,
  input: UpdateDoctorInput
) {
  const doctor = await doctorRepo.findDoctorById(id);
  if (!doctor) throw new NotFoundError("Doctor");
  assertWriteAccess(session, doctor);

  const updated = await doctorRepo.updateDoctor(
    id,
    {
      bio: input.bio,
      experienceYears: input.experienceYears,
      consultationFee: input.consultationFee,
      phone: input.phone,
    },
    input.specializationIds
  );

  await writeAuditLog({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "Doctor",
    entityId: id,
  });

  return updated;
}

export async function deleteDoctorService(session: Session, id: string) {
  if (!isAdminRole(session.user.role)) throw new ForbiddenError();

  const doctor = await doctorRepo.findDoctorById(id);
  if (!doctor) throw new NotFoundError("Doctor");

  const deleted = await doctorRepo.softDeleteDoctor(id);
  await writeAuditLog({
    actorId: session.user.id,
    action: "DELETE",
    entityType: "Doctor",
    entityId: id,
  });

  return deleted;
}
