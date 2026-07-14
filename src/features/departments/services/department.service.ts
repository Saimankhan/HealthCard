import "server-only";
import { NotFoundError } from "@/core/api/errors";
import { paginationMeta, paginationSkipTake } from "@/core/api/pagination";
import { writeAuditLog } from "@/features/audit-logs/services/audit-log.service";
import * as departmentRepo from "@/features/departments/repository/department.repository";
import type {
  CreateDepartmentInput,
  ListDepartmentsQuery,
  UpdateDepartmentInput,
} from "@/features/departments/validation/department.validation";

export async function listDepartmentsService(query: ListDepartmentsQuery) {
  const { skip, take } = paginationSkipTake(query);
  const { items, total } = await departmentRepo.listDepartments({
    skip,
    take,
    sortOrder: query.sortOrder,
    search: query.search,
  });
  return { items, meta: paginationMeta(query, total) };
}

export async function createDepartmentService(
  actorId: string,
  input: CreateDepartmentInput
) {
  const department = await departmentRepo.createDepartment(input);
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
  await writeAuditLog({
    actorId,
    action: "DELETE",
    entityType: "Department",
    entityId: id,
  });
  return deleted;
}
