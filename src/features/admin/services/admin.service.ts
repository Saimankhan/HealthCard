import "server-only";
import type { Session } from "@/core/auth/auth";
import { isAdminRole } from "@/core/auth/roles";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "@/core/api/errors";
import { paginationMeta, paginationSkipTake } from "@/core/api/pagination";
import { writeAuditLog } from "@/features/audit-logs/services/audit-log.service";
import * as adminRepo from "@/features/admin/repository/admin.repository";
import * as userRepo from "@/features/users/repository/user.repository";
import * as patientRepo from "@/features/patients/repository/patient.repository";
import type {
  CreateAdminInput,
  ListAdminsQuery,
  UpdateAdminInput,
} from "@/features/admin/validation/admin.validation";

export async function listAdminsService(query: ListAdminsQuery) {
  const { skip, take } = paginationSkipTake(query);
  const { items, total } = await adminRepo.listAdmins({
    skip,
    take,
    sortOrder: query.sortOrder,
  });
  return { items, meta: paginationMeta(query, total) };
}

export async function getAdminByIdService(id: string) {
  const admin = await adminRepo.findAdminById(id);
  if (!admin) throw new NotFoundError("Admin");
  return admin;
}

export async function getOwnAdminProfileService(session: Session) {
  const admin = await adminRepo.findAdminByUserId(session.user.id);
  if (!admin) throw new NotFoundError("Admin profile");
  return admin;
}

export async function createAdminService(
  actorId: string,
  input: CreateAdminInput
) {
  const user = await userRepo.findUserById(input.userId);
  if (!user) throw new NotFoundError("User");

  const existingAdmin = await adminRepo.findAdminByUserId(input.userId);
  if (existingAdmin) {
    throw new ConflictError("An admin profile already exists for this user");
  }

  if (!isAdminRole(user.role)) {
    await userRepo.updateUser(user.id, { role: "ADMIN" });
  }

  const existingPatient = await patientRepo.findPatientByUserId(input.userId);
  if (existingPatient) {
    await patientRepo.softDeletePatient(existingPatient.id);
  }

  const admin = await adminRepo.createAdmin({
    user: { connect: { id: input.userId } },
    department: input.department,
  });

  await writeAuditLog({
    actorId,
    action: "CREATE",
    entityType: "Admin",
    entityId: admin.id,
  });

  return admin;
}

export async function updateAdminService(
  actorId: string,
  id: string,
  input: UpdateAdminInput
) {
  const existing = await adminRepo.findAdminById(id);
  if (!existing) throw new NotFoundError("Admin");

  const updated = await adminRepo.updateAdmin(id, input);
  await writeAuditLog({
    actorId,
    action: "UPDATE",
    entityType: "Admin",
    entityId: id,
  });
  return updated;
}

export async function deleteAdminService(session: Session, id: string) {
  const existing = await adminRepo.findAdminById(id);
  if (!existing) throw new NotFoundError("Admin");

  if (existing.userId === session.user.id) {
    throw new BadRequestError("You cannot deactivate your own admin account");
  }

  const activeAdminCount = await adminRepo.countActiveAdmins();
  if (activeAdminCount <= 1) {
    throw new BadRequestError("Cannot remove the last remaining admin");
  }

  const deleted = await adminRepo.softDeleteAdmin(id);
  await writeAuditLog({
    actorId: session.user.id,
    action: "DELETE",
    entityType: "Admin",
    entityId: id,
  });
  return deleted;
}
