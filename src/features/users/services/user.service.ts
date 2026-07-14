import "server-only";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import type { Session } from "@/core/auth/auth";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/core/api/errors";
import { paginationMeta, paginationSkipTake } from "@/core/api/pagination";
import {
  assertValidFileUpload,
  deleteObject,
  getSignedUploadUrl,
  STORAGE_PREFIX,
} from "@/core/storage/storage";
import { resolveAvatarUrl } from "@/core/storage/avatar";
import { writeAuditLog } from "@/features/audit-logs/services/audit-log.service";
import * as userRepo from "@/features/users/repository/user.repository";
import * as patientRepo from "@/features/patients/repository/patient.repository";
import * as doctorRepo from "@/features/doctors/repository/doctor.repository";
import * as healthCardRepo from "@/features/healthcard/repository/health-card.repository";
import { createHealthCard } from "@/features/healthcard/repository/health-card.repository";
import type {
  ConfirmAvatarInput,
  CreateUserInput,
  ListUsersQuery,
  RequestAvatarUploadUrlInput,
  UpdateUserInput,
  UpdateUserRoleInput,
  UpdateUserStatusInput,
} from "@/features/users/validation/user.validation";

async function withResolvedAvatar<T extends { image: string | null }>(
  user: T
): Promise<T> {
  return { ...user, image: await resolveAvatarUrl(user.image) };
}

export async function getUserByIdService(id: string) {
  const user = await userRepo.findUserById(id);
  if (!user) {
    throw new NotFoundError("User");
  }
  return withResolvedAvatar(user);
}

export async function listUsersService(query: ListUsersQuery) {
  const { skip, take } = paginationSkipTake(query);
  const { items, total } = await userRepo.listUsers({
    skip,
    take,
    sortOrder: query.sortOrder,
    role: query.role,
    search: query.search,
    status: query.status,
  });
  const resolved = await Promise.all(items.map(withResolvedAvatar));
  return { items: resolved, meta: paginationMeta(query, total) };
}

export async function updateOwnProfileService(
  userId: string,
  input: UpdateUserInput
) {
  const updated = await userRepo.updateUser(userId, input);
  await writeAuditLog({
    actorId: userId,
    action: "UPDATE",
    entityType: "User",
    entityId: userId,
    metadata: { selfService: true },
  });
  return withResolvedAvatar(updated);
}

export async function adminUpdateUserService(
  actorId: string,
  targetUserId: string,
  input: UpdateUserInput
) {
  await getUserByIdService(targetUserId);
  const updated = await userRepo.updateUser(targetUserId, input);
  await writeAuditLog({
    actorId,
    action: "UPDATE",
    entityType: "User",
    entityId: targetUserId,
  });
  return withResolvedAvatar(updated);
}

export async function updateUserRoleService(
  session: Session,
  targetUserId: string,
  input: UpdateUserRoleInput
) {
  const isPrivilegedTarget =
    input.role === "ADMIN" || input.role === "SUPER_ADMIN";
  if (isPrivilegedTarget && session.user.role !== "SUPER_ADMIN") {
    throw new ForbiddenError("Only a super admin can grant admin-level roles");
  }

  await getUserByIdService(targetUserId);
  const updated = await userRepo.updateUser(targetUserId, {
    role: input.role,
  });
  await writeAuditLog({
    actorId: session.user.id,
    action: "STATUS_CHANGE",
    entityType: "User",
    entityId: targetUserId,
    metadata: { role: input.role },
  });
  return updated;
}

/**
 * `User.deletedAt` is the account-level switch, but Patient/Doctor rows
 * carry their own independent `deletedAt` — without this, a deactivated
 * doctor stayed fully bookable and a deactivated patient's HealthCard
 * stayed ACTIVE, since every Patient/Doctor query filters on their own
 * `deletedAt` only, never the linked User's status.
 */
async function cascadeUserDeactivation(userId: string) {
  const patient = await patientRepo.findPatientByUserId(userId);
  if (patient) {
    await patientRepo.softDeletePatient(patient.id);
    const card = await healthCardRepo.findHealthCardByPatientId(patient.id);
    if (card && card.status === "ACTIVE") {
      await healthCardRepo.updateHealthCardStatus(card.id, "REVOKED");
    }
  }

  const doctor = await doctorRepo.findDoctorByUserId(userId);
  if (doctor) {
    await doctorRepo.softDeleteDoctor(doctor.id);
  }
}

/**
 * Mirror of `cascadeUserDeactivation` for restores. Deliberately does not
 * reactivate a HealthCard that was revoked on deactivation — reissuing a
 * card is a distinct, explicit admin action, not an implicit side effect
 * of restoring account access.
 */
async function cascadeUserRestoration(userId: string) {
  const patient = await patientRepo.findPatientByUserIdIncludingDeleted(userId);
  if (patient?.deletedAt) {
    await patientRepo.restorePatient(patient.id);
  }

  const doctor = await doctorRepo.findDoctorByUserIdIncludingDeleted(userId);
  if (doctor?.deletedAt) {
    await doctorRepo.restoreDoctor(doctor.id);
  }
}

export async function deactivateUserService(
  actorId: string,
  targetUserId: string
) {
  await getUserByIdService(targetUserId);
  const updated = await userRepo.softDeleteUser(targetUserId);
  await cascadeUserDeactivation(targetUserId);
  await writeAuditLog({
    actorId,
    action: "DELETE",
    entityType: "User",
    entityId: targetUserId,
  });
  return updated;
}

export async function createUserService(
  actorId: string,
  input: CreateUserInput
) {
  const existing = await userRepo.findUserByEmail(input.email);
  if (existing) {
    throw new ConflictError("A user with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await userRepo.createUserWithPassword({
    id: randomUUID(),
    name: input.name,
    email: input.email,
    role: input.role,
    passwordHash,
  });

  if (input.role === "PATIENT") {
    const patient = await patientRepo.createPatient({
      user: { connect: { id: user.id } },
    });
    await createHealthCard(patient.id);
  }

  await writeAuditLog({
    actorId,
    action: "CREATE",
    entityType: "User",
    entityId: user.id,
    metadata: { role: input.role },
  });

  return withResolvedAvatar(user);
}

async function suspendUserService(actorId: string, targetUserId: string) {
  await getUserByIdService(targetUserId);
  const updated = await userRepo.suspendUser(targetUserId);
  await writeAuditLog({
    actorId,
    action: "STATUS_CHANGE",
    entityType: "User",
    entityId: targetUserId,
    metadata: { statusAction: "SUSPEND" },
  });
  return withResolvedAvatar(updated);
}

async function unsuspendUserService(actorId: string, targetUserId: string) {
  await getUserByIdService(targetUserId);
  const updated = await userRepo.unsuspendUser(targetUserId);
  await writeAuditLog({
    actorId,
    action: "STATUS_CHANGE",
    entityType: "User",
    entityId: targetUserId,
    metadata: { statusAction: "UNSUSPEND" },
  });
  return withResolvedAvatar(updated);
}

async function restoreUserService(actorId: string, targetUserId: string) {
  const target = await userRepo.findUserByIdIncludingDeleted(targetUserId);
  if (!target) throw new NotFoundError("User");

  const updated = await userRepo.restoreUser(targetUserId);
  await cascadeUserRestoration(targetUserId);
  await writeAuditLog({
    actorId,
    action: "STATUS_CHANGE",
    entityType: "User",
    entityId: targetUserId,
    metadata: { statusAction: "RESTORE" },
  });
  return withResolvedAvatar(updated);
}

export async function updateUserStatusService(
  session: Session,
  targetUserId: string,
  input: UpdateUserStatusInput
) {
  if (targetUserId === session.user.id) {
    throw new BadRequestError(
      "You cannot change the status of your own account"
    );
  }

  switch (input.action) {
    case "SUSPEND":
      return suspendUserService(session.user.id, targetUserId);
    case "UNSUSPEND":
      return unsuspendUserService(session.user.id, targetUserId);
    case "DELETE":
      return deactivateUserService(session.user.id, targetUserId);
    case "RESTORE":
      return restoreUserService(session.user.id, targetUserId);
  }
}

export async function deleteOwnAccountService(session: Session) {
  const updated = await userRepo.softDeleteUser(session.user.id);
  await cascadeUserDeactivation(session.user.id);
  await writeAuditLog({
    actorId: session.user.id,
    action: "DELETE",
    entityType: "User",
    entityId: session.user.id,
    metadata: { selfService: true },
  });
  return updated;
}

const AVATAR_UPLOAD_URL_RATE_LIMIT = { limit: 20, windowSeconds: 3600 };

export async function requestAvatarUploadUrlService(
  session: Session,
  input: RequestAvatarUploadUrlInput
) {
  const { checkRateLimit } = await import("@/core/security/rate-limit");
  const allowed = await checkRateLimit(
    `avatar-upload-url:${session.user.id}`,
    AVATAR_UPLOAD_URL_RATE_LIMIT.limit,
    AVATAR_UPLOAD_URL_RATE_LIMIT.windowSeconds
  );
  if (!allowed) {
    throw new ConflictError("Too many upload requests. Please wait a moment.");
  }

  assertValidFileUpload("profilePhotos", input.contentType, input.fileSize);

  const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileKey = `${STORAGE_PREFIX.profilePhotos}/${session.user.id}/${randomUUID()}-${safeFileName}`;

  const uploadUrl = await getSignedUploadUrl(fileKey, input.contentType);

  return { uploadUrl, fileKey };
}

export async function confirmAvatarService(
  session: Session,
  input: ConfirmAvatarInput
) {
  const expectedPrefix = `${STORAGE_PREFIX.profilePhotos}/${session.user.id}/`;
  if (!input.fileKey.startsWith(expectedPrefix)) {
    throw new ForbiddenError("File key does not belong to this user");
  }

  const previous = await userRepo.findUserById(session.user.id);

  const updated = await userRepo.updateUser(session.user.id, {
    image: input.fileKey,
  });

  if (
    previous?.image &&
    previous.image.startsWith(`${STORAGE_PREFIX.profilePhotos}/`) &&
    previous.image !== input.fileKey
  ) {
    await deleteObject(previous.image).catch(() => undefined);
  }

  await writeAuditLog({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "User",
    entityId: session.user.id,
    metadata: { avatarUpdated: true },
  });

  return withResolvedAvatar(updated);
}
