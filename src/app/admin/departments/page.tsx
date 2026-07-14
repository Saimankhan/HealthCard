import type { Metadata } from "next";

import { EntityCrudTable } from "@/components/admin/entity-crud-table";

export const metadata: Metadata = { title: "Departments - HealthCard Admin" };

export default function AdminDepartmentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Departments</h1>
        <p className="text-muted-foreground text-sm">
          Manage the organizational departments within the hospital.
        </p>
      </div>
      <EntityCrudTable apiPath="/api/departments" entityLabel="Department" />
    </div>
  );
}
