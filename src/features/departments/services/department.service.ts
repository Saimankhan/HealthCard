import "server-only";
import { NotFoundError } from "@/core/api/errors";
import { paginationMeta, paginationSkipTake } from "@/core/api/pagination";
import { CACHE_TTL, getOrSetCache, invalidateCache } from "@/core/cache/cache";
import { writeAuditLog } from "@/features/audit-logs/services/audit-log.service";
import * as departmentRepo from "@/features/departments/repository/department.repository";
import type {
  CreateDepartmentInput,
  ListDepartmentsQuery,
  UpdateDepartmentInput,
} from "@/features/departments/validation/department.validation";

const DEPARTMENT_LIST_DEFAULT_CACHE_KEY = "cache:departments:list:default";

/** Only the unfiltered first-page/default-sized request is cached — a search bypasses cache to avoid unbounded key growth. */
function isDefaultDepartmentListQuery(query: ListDepartmentsQuery) {
  return (
    !query.search &&
    query.page === 1 &&
    query.pageSize === 100 &&
    query.sortOrder === "asc"
  );
}

export async function listDepartmentsService(query: ListDepartmentsQuery) {
  const { skip, take } = paginationSkipTake(query);
  const fetcher = async () => {
    const { items, total } = await departmentRepo.listDepartments({
      skip,
      take,
      sortOrder: query.sortOrder,
      search: query.search,
    });
    return { items, meta: paginationMeta(query, total) };
  };

  if (isDefaultDepartmentListQuery(query)) {
    return getOrSetCache(
      DEPARTMENT_LIST_DEFAULT_CACHE_KEY,
      CACHE_TTL.departmentList,
      fetcher
    );
  }
  return fetcher();
}

export async function createDepartmentService(
  actorId: string,
  input: CreateDepartmentInput
) {
  const department = await departmentRepo.createDepartment(input);
  await invalidateCache(DEPARTMENT_LIST_DEFAULT_CACHE_KEY);
  await writeAuditLog({
    actorId,
    action: "CREATE",
    entityType: "Department",
    entityId: department.id,
  });
  return department;
}

export async function updateDepartmentService(
  actorId: string,
  id: string,
  input: UpdateDepartmentInput
) {
  const existing = await departmentRepo.findDepartmentById(id);
  if (!existing) throw new NotFoundError("Department");

  const updated = await departmentRepo.updateDepartment(id, input);
  await invalidateCache(DEPARTMENT_LIST_DEFAULT_CACHE_KEY);
  await writeAuditLog({
    actorId,
    action: "UPDATE",
    entityType: "Department",
    entityId: id,
  });
  return updated;
}

export async function deleteDepartmentService(actorId: string, id: string) {
  const existing = await departmentRepo.findDepartmentById(id);
  if (!existing) throw new NotFoundError("Department");

  const deleted = await departmentRepo.softDeleteDepartment(id);
  await invalidateCache(DEPARTMENT_LIST_DEFAULT_CACHE_KEY);
  await writeAuditLog({
    actorId,
    action: "DELETE",
    entityType: "Department",
    entityId: id,
  });
  return deleted;
}
