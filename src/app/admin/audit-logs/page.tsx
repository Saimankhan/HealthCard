import type { Metadata } from "next";

import { AuditLogsList } from "@/components/admin/audit-logs/audit-logs-list";

export const metadata: Metadata = { title: "Audit Logs - HealthCard Admin" };

export default function AdminAuditLogsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit Logs</h1>
        <p className="text-muted-foreground text-sm">
          Complete history of important system actions.
        </p>
      </div>
      <AuditLogsList />
    </div>
  );
}
