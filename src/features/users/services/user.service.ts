import "server-only";
import { NotFoundError } from "@/core/api/errors";
import { paginationMeta, paginationSkipTake } from "@/core/api/pagination";
import { writeAuditLog } from "@/features/audit-logs/services/audit-log.service";
import * as userRepo from "@/features/users/repository/user.repository";
import type {
  ListUsersQuery,
  UpdateUserInput,
  UpdateUserRoleInput,
} from "@/features/users/validation/user.validation";

export async function getUserByIdService(id: string) {
  const user = await userRepo.findUserById(id);
  if (!user) {
    throw new NotFoundError("User");
  }
  return user;
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
  return { items, meta: paginationMeta(query, total) };
}

export async function updateOwnProfileService(
  userId: string,
  input: UpdateUserInput
) {
  return userRepo.updateUser(userId, input);
}

export async function updateUserRoleService(
  actorId: string,
  targetUserId: string,
  input: UpdateUserRoleInput
) {
  await getUserByIdService(targetUserId);
  const updated = await userRepo.updateUser(targetUserId, {
    role: input.role,
  });
  await writeAuditLog({
    actorId,
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
