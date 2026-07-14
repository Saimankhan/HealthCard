"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { apiFetch, apiFetchWithMeta } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

const TABS = [
  { value: "TODAY", label: "Today" },
  { value: "UPCOMING", label: "Upcoming" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ALL", label: "All" },
];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function DoctorAppointmentsList() {
  const [items, setItems] = useState<AppointmentListItem[] | null>(null);
  const [tab, setTab] = useState("TODAY");
  const [actingId, setActingId] = useState<string | null>(null);
  const [rescheduleTarget, setRescheduleTarget] =
    useState<AppointmentListItem | null>(null);
  const [newDateTime, setNewDateTime] = useState("");

  async function load() {
    try {
      const { data } = await apiFetchWithMeta<AppointmentListItem[]>(
        "/api/appointments?sortOrder=asc&pageSize=100"
      );
      setItems(data);
    } catch {
      toast.error("Unable to load appointments");
      setItems([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!items) return null;
    const now = new Date();
    if (tab === "TODAY") {
      return items.filter(
        (a) =>
          (a.status === "PENDING" || a.status === "CONFIRMED") &&
          isSameDay(new Date(a.scheduledAt), now)
      );
    }
    if (tab === "UPCOMING") {
      return items.filter(
        (a) =>
          (a.status === "PENDING" || a.status === "CONFIRMED") &&
          !isSameDay(new Date(a.scheduledAt), now)
      );
    }
    if (tab === "COMPLETED") {
      return items.filter((a) => a.status === "COMPLETED");
    }
    return items;
  }, [items, tab]);

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
      <Tabs value={tab} onValueChange={(v) => setTab(v ?? "TODAY")}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState message="No appointments found." />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((appt) => (
            <Card key={appt.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{appt.patient.user.name}</p>
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
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    render={
                      <Link href={`/doctor/appointments/${appt.id}`}>
                        Details
                      </Link>
                    }
                  />
                  {appt.status === "PENDING" && (
                    <>
                      <Button
                        size="sm"
                        disabled={actingId === appt.id}
                        onClick={() => updateStatus(appt.id, "CONFIRMED")}
                      >
                        Accept
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button variant="destructive" size="sm">
                              Reject
                            </Button>
                          }
                        />
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Reject this appointment?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will cancel the request from{" "}
                              {appt.patient.user.name}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep it</AlertDialogCancel>
                            <AlertDialogAction
                              disabled={actingId === appt.id}
                              onClick={() => updateStatus(appt.id, "CANCELLED")}
                            >
                              Reject
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                  {appt.status === "CONFIRMED" && (
                    <>
                      <Button
                        size="sm"
                        disabled={actingId === appt.id}
                        onClick={() => updateStatus(appt.id, "COMPLETED")}
                      >
                        Mark completed
                      </Button>
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
                              This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep it</AlertDialogCancel>
                            <AlertDialogAction
                              disabled={actingId === appt.id}
                              onClick={() => updateStatus(appt.id, "CANCELLED")}
                            >
                              Yes, cancel
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                  {(appt.status === "PENDING" ||
                    appt.status === "CONFIRMED") && (
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
          ))}
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
