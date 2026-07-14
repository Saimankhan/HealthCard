"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Search } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { useListQuery } from "@/hooks/use-list-query";
import { formatDateTime } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/patient/status-badge";
import { EmptyState } from "@/components/patient/section-card";
import type { AppointmentListItem } from "@/components/patient/appointments/types";

const STATUS_FILTERS = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No Show" },
];

const NEXT_STATUSES: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export function AdminAppointmentsList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actingId, setActingId] = useState<string | null>(null);
  const [rescheduleTarget, setRescheduleTarget] =
    useState<AppointmentListItem | null>(null);
  const [newDateTime, setNewDateTime] = useState("");

  const {
    items,
    error,
    reload: load,
  } = useListQuery<AppointmentListItem, Record<string, string>>({
    endpoint: "/api/appointments",
    filters: { search, status: statusFilter },
    baseParams: { sortOrder: "desc", pageSize: "100" },
  });

  useEffect(() => {
    if (error) toast.error("Unable to load appointments");
  }, [error]);

  async function updateStatus(id: string, status: string) {
    setActingId(id);
    try {
      await apiFetch(`/api/appointments/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success("Appointment updated");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to update");
    } finally {
      setActingId(null);
    }
  }

  async function submitReschedule() {
    if (!rescheduleTarget || !newDateTime) {
      toast.error("Choose a new date and time");
      return;
    }
    setActingId(rescheduleTarget.id);
    try {
      await apiFetch(`/api/appointments/${rescheduleTarget.id}/reschedule`, {
        method: "PATCH",
        body: JSON.stringify({
          scheduledAt: new Date(newDateTime).toISOString(),
        }),
      });
      toast.success("Appointment rescheduled");
      setRescheduleTarget(null);
      setNewDateTime("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to reschedule");
    } finally {
      setActingId(null);
    }
  }

  const minDateTime = new Date(Date.now() + 30 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search by patient or doctor..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v ?? "ALL")}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {items === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState message="No appointments found." />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((appt) => {
            const nextOptions = NEXT_STATUSES[appt.status] ?? [];
            const canModify = nextOptions.length > 0;
            return (
              <Card key={appt.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {appt.patient.user.name} &rarr; Dr.{" "}
                        {appt.doctor.user.name}
                      </p>
                      <StatusBadge status={appt.status} />
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {formatDateTime(appt.scheduledAt)} &middot;{" "}
                      {appt.durationMinutes} min
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      render={
                        <Link href={`/admin/appointments/${appt.id}`}>
                          Details
                        </Link>
                      }
                    />
                    {canModify && (
                      <Select
                        value={appt.status}
                        onValueChange={(v) =>
                          v && v !== appt.status && updateStatus(appt.id, v)
                        }
                        disabled={actingId === appt.id}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={appt.status}>
                            {appt.status}
                          </SelectItem>
                          {nextOptions.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {canModify && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRescheduleTarget(appt);
                          setNewDateTime("");
                        }}
                      >
                        Reschedule
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!rescheduleTarget}
        onOpenChange={(open) => !open && setRescheduleTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule appointment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <label className="text-sm font-medium">New date &amp; time</label>
            <Input
              type="datetime-local"
              min={minDateTime}
              value={newDateTime}
              onChange={(e) => setNewDateTime(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              disabled={!!rescheduleTarget && actingId === rescheduleTarget.id}
              onClick={submitReschedule}
            >
              Confirm new time
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
