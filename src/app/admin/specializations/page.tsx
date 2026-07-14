import type { Metadata } from "next";

import { EntityCrudTable } from "@/components/admin/entity-crud-table";

export const metadata: Metadata = {
  title: "Specializations - HealthCard Admin",
};

export default function AdminSpecializationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Specializations</h1>
        <p className="text-muted-foreground text-sm">
          Manage the list of medical specializations doctors can be assigned.
        </p>
      </div>
      <EntityCrudTable
        apiPath="/api/specializations"
        entityLabel="Specialization"
      />
    </div>
  );
}
