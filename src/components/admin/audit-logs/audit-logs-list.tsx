"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { apiFetchWithMeta } from "@/lib/api-client";
import { formatDateTime, formatEnumLabel } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/patient/section-card";

const ACTION_FILTERS = [
  { value: "ALL", label: "All actions" },
  { value: "CREATE", label: "Create" },
  { value: "UPDATE", label: "Update" },
  { value: "DELETE", label: "Delete" },
  { value: "STATUS_CHANGE", label: "Status Change" },
  { value: "LOGIN", label: "Login" },
  { value: "LOGOUT", label: "Logout" },
];

type AuditLogRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  metadata: unknown;
  actor: { id: string; name: string; email: string } | null;
};

export function AuditLogsList() {
  const [items, setItems] = useState<AuditLogRow[] | null>(null);
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load() {
    try {
      const params = new URLSearchParams({
        sortOrder: "desc",
        pageSize: "100",
      });
      if (entityType.trim()) params.set("entityType", entityType.trim());
      if (action !== "ALL") params.set("action", action);
      if (from) params.set("from", new Date(from).toISOString());
      if (to) params.set("to", new Date(to).toISOString());

      const { data } = await apiFetchWithMeta<AuditLogRow[]>(
        `/api/audit-logs?${params.toString()}`
      );
      setItems(data);
    } catch {
      toast.error("Unable to load audit logs");
      setItems([]);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, action, from, to]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Entity type (e.g. Appointment)"
          className="max-w-56"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
        />
        <Select value={action} onValueChange={(v) => setAction(v ?? "ALL")}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          className="w-40"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Input
          type="date"
          className="w-40"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>

      {items === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState message="No audit log entries found." />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((log) => (
            <Card key={log.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {formatEnumLabel(log.action)}
                    </Badge>
                    <p className="font-medium">
                      {log.entityType}
                      {log.entityId ? ` #${log.entityId.slice(0, 8)}` : ""}
                    </p>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {log.actor
                      ? `${log.actor.name} (${log.actor.email})`
                      : "System"}
                  </p>
                </div>
                <p className="text-muted-foreground text-xs">
                  {formatDateTime(log.createdAt)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
