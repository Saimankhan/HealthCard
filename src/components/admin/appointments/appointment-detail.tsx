"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { apiFetch } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/patient/status-badge";
import type { AppointmentListItem } from "@/components/patient/appointments/types";

const NEXT_STATUSES: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export function AdminAppointmentDetail({ id }: { id: string }) {
  const [appointment, setAppointment] = useState<AppointmentListItem | null>(
    null
  );
  const [notFound, setNotFound] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [newDateTime, setNewDateTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    try {
      const data = await apiFetch<AppointmentListItem>(
        `/api/appointments/${id}`
      );
      setAppointment(data);
    } catch {
      setNotFound(true);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function updateStatus(status: string) {
    setIsSubmitting(true);
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
      setIsSubmitting(false);
    }
  }

  async function submitReschedule() {
    if (!newDateTime) {
      toast.error("Choose a new date and time");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiFetch(`/api/appointments/${id}/reschedule`, {
        method: "PATCH",
        body: JSON.stringify({
          scheduledAt: new Date(newDateTime).toISOString(),
        }),
      });
      toast.success("Appointment rescheduled");
      setRescheduleOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to reschedule");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (notFound) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground text-sm">
            Appointment not found.
          </p>
          <Button
            className="mt-4"
            render={
              <Link href="/admin/appointments">Back to appointments</Link>
            }
          />
        </CardContent>
      </Card>
    );
  }

  if (!appointment) {
    return <Skeleton className="h-64 w-full" />;
  }

  const nextOptions = NEXT_STATUSES[appointment.status] ?? [];
  const canModify = nextOptions.length > 0;
  const minDateTime = new Date(Date.now() + 30 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        render={
          <Link href="/admin/appointments">
            <ArrowLeft />
            Back to appointments
          </Link>
        }
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Appointment details</CardTitle>
          <StatusBadge status={appointment.status} />
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Patient</p>
              <p className="font-medium">{appointment.patient.user.name}</p>
              <p className="text-muted-foreground">
                {appointment.patient.user.email}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Doctor</p>
              <p className="font-medium">Dr. {appointment.doctor.user.name}</p>
              <p className="text-muted-foreground">
                {appointment.doctor.user.email}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Date &amp; time</p>
              <p className="font-medium">
                {formatDateTime(appointment.scheduledAt)}
              </p>
              <p className="text-muted-foreground">
                {appointment.durationMinutes} minutes
              </p>
            </div>
          </div>
          {appointment.reason && (
            <div>
              <p className="text-muted-foreground">Reason</p>
              <p>{appointment.reason}</p>
            </div>
          )}
          {appointment.cancelledAt && (
            <div>
              <p className="text-muted-foreground">Cancelled</p>
              <p>{formatDateTime(appointment.cancelledAt)}</p>
            </div>
          )}

          {canModify && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Select
                value={appointment.status}
                onValueChange={(v) =>
                  v && v !== appointment.status && updateStatus(v)
                }
                disabled={isSubmitting}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={appointment.status}>
                    {appointment.status}
                  </SelectItem>
                  {nextOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => setRescheduleOpen(true)}>
                Reschedule
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
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
            <Button disabled={isSubmitting} onClick={submitReschedule}>
              {isSubmitting ? "Saving..." : "Confirm new time"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
