"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { apiFetch, apiFetchWithMeta } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/patient/status-badge";
import { EmptyState } from "@/components/patient/section-card";
import type { AppointmentListItem } from "@/components/patient/appointments/types";

const STATUS_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No Show" },
];

export function AppointmentsList() {
  const [items, setItems] = useState<AppointmentListItem[] | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  async function load() {
    setItems(null);
    try {
      const { data } = await apiFetchWithMeta<AppointmentListItem[]>(
        `/api/appointments?sortOrder=desc&pageSize=50${
          statusFilter !== "ALL" ? `&status=${statusFilter}` : ""
        }`
      );
      setItems(data);
    } catch {
      toast.error("Unable to load appointments");
      setItems([]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function cancelAppointment(id: string) {
    setCancellingId(id);
    try {
      await apiFetch(`/api/appointments/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      toast.success("Appointment cancelled");
      load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to cancel appointment"
      );
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value ?? "ALL")}
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
        <Button
          render={
            <Link href="/patient/appointments/book">Book appointment</Link>
          }
        />
      </div>

      {items === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
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
            const canModify =
              appt.status === "PENDING" || appt.status === "CONFIRMED";
            return (
              <Card key={appt.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">Dr. {appt.doctor.user.name}</p>
                      <StatusBadge status={appt.status} />
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {formatDateTime(appt.scheduledAt)} &middot;{" "}
                      {appt.durationMinutes} min
                    </p>
                    {appt.reason && (
                      <p className="text-muted-foreground mt-1 truncate text-sm">
                        {appt.reason}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      render={
                        <Link href={`/patient/appointments/${appt.id}`}>
                          Details
                        </Link>
                      }
                    />
                    {canModify && (
                      <Button
                        variant="outline"
                        size="sm"
                        render={
                          <Link
                            href={`/patient/appointments/${appt.id}?reschedule=1`}
                          >
                            Reschedule
                          </Link>
                        }
                      />
                    )}
                    {canModify && (
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button variant="destructive" size="sm">
                              Cancel
                            </Button>
                          }
                        />
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Cancel this appointment?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will cancel your appointment with Dr.{" "}
                              {appt.doctor.user.name} on{" "}
                              {formatDateTime(appt.scheduledAt)}. This cannot be
                              undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep it</AlertDialogCancel>
                            <AlertDialogAction
                              disabled={cancellingId === appt.id}
                              onClick={() => cancelAppointment(appt.id)}
                            >
                              Yes, cancel
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
