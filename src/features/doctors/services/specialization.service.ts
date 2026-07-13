import "server-only";
import { NotFoundError } from "@/core/api/errors";
import { paginationMeta, paginationSkipTake } from "@/core/api/pagination";
import { writeAuditLog } from "@/features/audit-logs/services/audit-log.service";
import * as specializationRepo from "@/features/doctors/repository/specialization.repository";
import type {
  CreateSpecializationInput,
  ListSpecializationsQuery,
  UpdateSpecializationInput,
} from "@/features/doctors/validation/specialization.validation";

export async function listSpecializationsService(
  query: ListSpecializationsQuery
) {
  const { skip, take } = paginationSkipTake(query);
  const { items, total } = await specializationRepo.listSpecializations({
    skip,
    take,
    sortOrder: query.sortOrder,
    search: query.search,
  });
  return { items, meta: paginationMeta(query, total) };
}

export async function createSpecializationService(
  actorId: string,
  input: CreateSpecializationInput
) {
  const specialization = await specializationRepo.createSpecialization(input);
  await writeAuditLog({
    actorId,
    action: "CREATE",
    entityType: "Specialization",
    entityId: specialization.id,
  });
  return specialization;
}

export async function updateSpecializationService(
  actorId: string,
  id: string,
  input: UpdateSpecializationInput
) {
  const existing = await specializationRepo.findSpecializationById(id);
  if (!existing) throw new NotFoundError("Specialization");

  const updated = await specializationRepo.updateSpecialization(id, input);
  await writeAuditLog({
    actorId,
    action: "UPDATE",
    entityType: "Specialization",
    entityId: id,
  });
  return updated;
}

export async function deleteSpecializationService(actorId: string, id: string) {
  const existing = await specializationRepo.findSpecializationById(id);
  if (!existing) throw new NotFoundError("Specialization");

  const deleted = await specializationRepo.softDeleteSpecialization(id);
  await writeAuditLog({
    actorId,
    action: "DELETE",
    entityType: "Specialization",
    entityId: id,
  });
  return deleted;
}
