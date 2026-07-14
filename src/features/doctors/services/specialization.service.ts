import "server-only";
import { NotFoundError } from "@/core/api/errors";
import { paginationMeta, paginationSkipTake } from "@/core/api/pagination";
import { CACHE_TTL, getOrSetCache, invalidateCache } from "@/core/cache/cache";
import { writeAuditLog } from "@/features/audit-logs/services/audit-log.service";
import * as specializationRepo from "@/features/doctors/repository/specialization.repository";
import type {
  CreateSpecializationInput,
  ListSpecializationsQuery,
  UpdateSpecializationInput,
} from "@/features/doctors/validation/specialization.validation";

const SPECIALIZATION_LIST_DEFAULT_CACHE_KEY =
  "cache:specializations:list:default";

/** Only the unfiltered first-page/default-sized request is cached — a search bypasses cache to avoid unbounded key growth. */
function isDefaultSpecializationListQuery(query: ListSpecializationsQuery) {
  return (
    !query.search &&
    query.page === 1 &&
    query.pageSize === 100 &&
    query.sortOrder === "asc"
  );
}

export async function listSpecializationsService(
  query: ListSpecializationsQuery
) {
  const { skip, take } = paginationSkipTake(query);
  const fetcher = async () => {
    const { items, total } = await specializationRepo.listSpecializations({
      skip,
      take,
      sortOrder: query.sortOrder,
      search: query.search,
    });
    return { items, meta: paginationMeta(query, total) };
  };

  if (isDefaultSpecializationListQuery(query)) {
    return getOrSetCache(
      SPECIALIZATION_LIST_DEFAULT_CACHE_KEY,
      CACHE_TTL.specializationList,
      fetcher
    );
  }
  return fetcher();
}

export async function createSpecializationService(
  actorId: string,
  input: CreateSpecializationInput
) {
  const specialization = await specializationRepo.createSpecialization(input);
  await invalidateCache(SPECIALIZATION_LIST_DEFAULT_CACHE_KEY);
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
  await invalidateCache(SPECIALIZATION_LIST_DEFAULT_CACHE_KEY);
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
  await invalidateCache(SPECIALIZATION_LIST_DEFAULT_CACHE_KEY);
  await writeAuditLog({
    actorId,
    action: "DELETE",
    entityType: "Specialization",
    entityId: id,
  });
  return deleted;
}
