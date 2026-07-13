import "server-only";
import { randomUUID } from "node:crypto";
import type { Session } from "@/core/auth/auth";
import { ForbiddenError, NotFoundError } from "@/core/api/errors";
import { paginationMeta, paginationSkipTake } from "@/core/api/pagination";
import {
  deleteObject,
  getSignedUploadUrl,
  STORAGE_PREFIX,
} from "@/core/storage/storage";
import { resolveAvatarUrl } from "@/core/storage/avatar";
import { writeAuditLog } from "@/features/audit-logs/services/audit-log.service";
import * as userRepo from "@/features/users/repository/user.repository";
import type {
  ConfirmAvatarInput,
  ListUsersQuery,
  RequestAvatarUploadUrlInput,
  UpdateUserInput,
  UpdateUserRoleInput,
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
  });
  const resolved = await Promise.all(items.map(withResolvedAvatar));
  return { items: resolved, meta: paginationMeta(query, total) };
}

export async function updateOwnProfileService(
  userId: string,
  input: UpdateUserInput
) {
  const updated = await userRepo.updateUser(userId, input);
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

export async function deactivateUserService(
  actorId: string,
  targetUserId: string
) {
  await getUserByIdService(targetUserId);
  const updated = await userRepo.softDeleteUser(targetUserId);
  await writeAuditLog({
    actorId,
    action: "DELETE",
    entityType: "User",
    entityId: targetUserId,
  });
  return updated;
}

export async function deleteOwnAccountService(session: Session) {
  const updated = await userRepo.softDeleteUser(session.user.id);
  await writeAuditLog({
    actorId: session.user.id,
    action: "DELETE",
    entityType: "User",
    entityId: session.user.id,
    metadata: { selfService: true },
  });
  return updated;
}

export async function requestAvatarUploadUrlService(
  session: Session,
  input: RequestAvatarUploadUrlInput
) {
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
