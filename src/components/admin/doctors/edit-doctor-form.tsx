"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays } from "lucide-react";

import { apiFetch, apiFetchWithMeta } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type Specialization = { id: string; name: string };

type DoctorDetail = {
  id: string;
  userName: string;
  userEmail: string;
  licenseNumber: string;
  bio: string | null;
  experienceYears: number | null;
  consultationFee: string | null;
  phone: string | null;
  specializationIds: string[];
};

export function EditDoctorForm({ doctor }: { doctor: DoctorDetail }) {
  const router = useRouter();
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [selectedSpecializationIds, setSelectedSpecializationIds] = useState<
    string[]
  >(doctor.specializationIds);
  const [bio, setBio] = useState(doctor.bio ?? "");
  const [experienceYears, setExperienceYears] = useState(
    doctor.experienceYears !== null ? String(doctor.experienceYears) : ""
  );
  const [consultationFee, setConsultationFee] = useState(
    doctor.consultationFee ?? ""
  );
  const [phone, setPhone] = useState(doctor.phone ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [appointmentCount, setAppointmentCount] = useState<number | null>(null);

  useEffect(() => {
    apiFetch<Specialization[]>(
      "/api/specializations?pageSize=100&sortOrder=asc"
    )
      .then((data) => setSpecializations(data))
      .catch(() => setSpecializations([]));
    apiFetchWithMeta(`/api/appointments?doctorId=${doctor.id}&pageSize=1`)
      .then(({ meta }) => setAppointmentCount(Number(meta?.total ?? 0)))
      .catch(() => setAppointmentCount(null));
  }, [doctor.id]);

  function toggleSpecialization(id: string) {
    setSelectedSpecializationIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function onSave() {
    setIsSaving(true);
    try {
      await apiFetch(`/api/doctors/${doctor.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          bio: bio || undefined,
          experienceYears: experienceYears
            ? Number(experienceYears)
            : undefined,
          consultationFee: consultationFee
            ? Number(consultationFee)
            : undefined,
          phone: phone || undefined,
          specializationIds: selectedSpecializationIds,
        }),
      });
      toast.success("Doctor updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setIsSaving(false);
    }
  }

  async function onRemove() {
    setIsRemoving(true);
    try {
      await apiFetch(`/api/doctors/${doctor.id}`, { method: "DELETE" });
      toast.success("Doctor removed");
      router.push("/admin/doctors");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to remove doctor"
      );
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Dr. {doctor.userName}</CardTitle>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="destructive" size="sm" disabled={isRemoving}>
                  Remove doctor
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove this doctor?</AlertDialogTitle>
                <AlertDialogDescription>
                  Dr. {doctor.userName} will no longer appear as an active
                  doctor. This does not delete their user account.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep it</AlertDialogCancel>
                <AlertDialogAction disabled={isRemoving} onClick={onRemove}>
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Email</p>
            <p className="font-medium">{doctor.userEmail}</p>
          </div>
          <div>
            <p className="text-muted-foreground">License number</p>
            <p className="font-medium">{doctor.licenseNumber}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Doctor Statistics</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3 text-sm">
          <CalendarDays className="text-primary size-6" />
          <span>
            {appointmentCount === null
              ? "Loading..."
              : `${appointmentCount} total appointment(s)`}
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Years of experience</label>
              <Input
                type="number"
                min={0}
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Consultation fee</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Bio</label>
            <Textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">
              Specializations
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {specializations.map((spec) => (
                <label
                  key={spec.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={selectedSpecializationIds.includes(spec.id)}
                    onCheckedChange={() => toggleSpecialization(spec.id)}
                  />
                  {spec.name}
                </label>
              ))}
            </div>
          </div>
          <Button className="w-fit" disabled={isSaving} onClick={onSave}>
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
