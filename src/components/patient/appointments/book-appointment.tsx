"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search } from "lucide-react";

import { apiFetch, apiFetchWithMeta } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/patient/section-card";

type Specialization = { id: string; name: string };
type Doctor = {
  id: string;
  bio: string | null;
  experienceYears: number | null;
  consultationFee: string | null;
  user: { id: string; name: string; email: string };
  specializations: { specialization: Specialization }[];
};

export function BookAppointment() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [specializationId, setSpecializationId] = useState("ALL");
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [doctors, setDoctors] = useState<Doctor[] | null>(null);

  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("30");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    apiFetchWithMeta<Specialization[]>(
      "/api/specializations?pageSize=100&sortOrder=asc"
    )
      .then(({ data }) => setSpecializations(data))
      .catch(() => undefined);
  }, []);

  async function loadDoctors() {
    setDoctors(null);
    try {
      const params = new URLSearchParams({
        pageSize: "20",
        sortOrder: "asc",
      });
      if (search.trim()) params.set("search", search.trim());
      if (specializationId !== "ALL")
        params.set("specializationId", specializationId);

      const { data } = await apiFetchWithMeta<Doctor[]>(
        `/api/doctors?${params.toString()}`
      );
      setDoctors(data);
    } catch {
      toast.error("Unable to load doctors");
      setDoctors([]);
    }
  }

  useEffect(() => {
    loadDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specializationId]);

  function openBooking(doctor: Doctor) {
    setSelectedDoctor(doctor);
    setScheduledAt("");
    setDuration("30");
    setReason("");
    setDialogOpen(true);
  }

  async function submitBooking() {
    if (!selectedDoctor || !scheduledAt) {
      toast.error("Choose a date and time");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiFetch("/api/appointments", {
        method: "POST",
        body: JSON.stringify({
          doctorId: selectedDoctor.id,
          scheduledAt: new Date(scheduledAt).toISOString(),
          durationMinutes: Number(duration),
          reason: reason || undefined,
        }),
      });
      toast.success("Appointment requested");
      setDialogOpen(false);
      router.push("/patient/appointments");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to book appointment"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const minDateTime = new Date(Date.now() + 30 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-48 flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search doctors by name..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadDoctors()}
          />
        </div>
        <Select
          value={specializationId}
          onValueChange={(value) => setSpecializationId(value ?? "ALL")}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All specializations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All specializations</SelectItem>
            {specializations.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={loadDoctors}>
          Search
        </Button>
      </div>

      {doctors === null ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : doctors.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState message="No doctors match your search." />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {doctors.map((doctor) => (
            <Card key={doctor.id}>
              <CardContent className="flex flex-col gap-2 py-4">
                <p className="font-medium">Dr. {doctor.user.name}</p>
                <div className="flex flex-wrap gap-1">
                  {doctor.specializations.map((s) => (
                    <Badge key={s.specialization.id} variant="secondary">
                      {s.specialization.name}
                    </Badge>
                  ))}
                </div>
                {doctor.bio && (
                  <p className="text-muted-foreground line-clamp-2 text-sm">
                    {doctor.bio}
                  </p>
                )}
                <div className="text-muted-foreground flex justify-between text-sm">
                  <span>{doctor.experienceYears ?? 0} yrs experience</span>
                  {doctor.consultationFee && (
                    <span>${Number(doctor.consultationFee).toFixed(2)}</span>
                  )}
                </div>
                <Button className="mt-2" onClick={() => openBooking(doctor)}>
                  Book
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book with Dr. {selectedDoctor?.user.name}</DialogTitle>
            <DialogDescription>
              Choose a date, time, and let your doctor know the reason for your
              visit.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Date &amp; time</label>
              <Input
                type="datetime-local"
                min={minDateTime}
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Duration</label>
              <Select
                value={duration}
                onValueChange={(value) => setDuration(value ?? "30")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Reason (optional)</label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Annual checkup"
              />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={isSubmitting} onClick={submitBooking}>
              {isSubmitting ? "Booking..." : "Confirm booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
