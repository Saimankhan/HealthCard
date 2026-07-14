"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Camera } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
type Day = (typeof DAYS)[number];

type AvailabilitySlot = {
  day: Day;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
};

const practiceInfoSchema = z.object({
  bio: z.string().trim().max(1000).optional().or(z.literal("")),
  experienceYears: z.string().trim().optional().or(z.literal("")),
  consultationFee: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

type DoctorProfile = {
  id: string;
  licenseNumber: string;
  bio: string | null;
  experienceYears: number | null;
  consultationFee: string | null;
  phone: string | null;
  availability: AvailabilitySlot[] | null;
  specializationIds: string[];
};

type UserProfile = {
  name: string;
  email: string;
  image: string | null;
};

type Specialization = { id: string; name: string };

function defaultAvailability(
  existing: AvailabilitySlot[] | null
): AvailabilitySlot[] {
  return DAYS.map((day) => {
    const found = existing?.find((slot) => slot.day === day);
    return (
      found ?? {
        day,
        startTime: "09:00",
        endTime: "17:00",
        isAvailable: false,
      }
    );
  });
}

export function DoctorProfileForm({
  doctor,
  user,
}: {
  doctor: DoctorProfile;
  user: UserProfile;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(user.image);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingPractice, setIsSavingPractice] = useState(false);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [selectedSpecializationIds, setSelectedSpecializationIds] = useState<
    string[]
  >(doctor.specializationIds);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>(
    defaultAvailability(doctor.availability)
  );

  useEffect(() => {
    apiFetch<Specialization[]>(
      "/api/specializations?pageSize=100&sortOrder=asc"
    )
      .then((data) => setSpecializations(data))
      .catch(() => setSpecializations([]));
  }, []);

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const practiceForm = useForm<z.infer<typeof practiceInfoSchema>>({
    resolver: zodResolver(practiceInfoSchema),
    defaultValues: {
      bio: doctor.bio ?? "",
      experienceYears:
        doctor.experienceYears !== null ? String(doctor.experienceYears) : "",
      consultationFee: doctor.consultationFee ?? "",
      phone: doctor.phone ?? "",
    },
  });

  async function onSavePractice(values: z.infer<typeof practiceInfoSchema>) {
    setIsSavingPractice(true);
    try {
      await apiFetch(`/api/doctors/${doctor.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          bio: values.bio || undefined,
          experienceYears: values.experienceYears
            ? Number(values.experienceYears)
            : undefined,
          consultationFee: values.consultationFee
            ? Number(values.consultationFee)
            : undefined,
          phone: values.phone || undefined,
          specializationIds: selectedSpecializationIds,
        }),
      });
      toast.success("Profile updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setIsSavingPractice(false);
    }
  }

  async function onSaveAvailability() {
    setIsSavingAvailability(true);
    try {
      await apiFetch(`/api/doctors/${doctor.id}`, {
        method: "PATCH",
        body: JSON.stringify({ availability }),
      });
      toast.success("Availability updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setIsSavingAvailability(false);
    }
  }

  function toggleSpecialization(id: string) {
    setSelectedSpecializationIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function updateSlot(day: Day, patch: Partial<AvailabilitySlot>) {
    setAvailability((prev) =>
      prev.map((slot) => (slot.day === day ? { ...slot, ...patch } : slot))
    );
  }

  async function onAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { uploadUrl, fileKey } = await apiFetch<{
        uploadUrl: string;
        fileKey: string;
      }>("/api/users/me/avatar/upload-url", {
        method: "POST",
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Upload to storage failed");

      const updated = await apiFetch<{ image: string | null }>(
        "/api/users/me/avatar",
        {
          method: "PATCH",
          body: JSON.stringify({ fileKey }),
        }
      );

      setAvatarUrl(updated.image);
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to upload photo"
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex items-center gap-4 py-6">
          <Avatar className="size-16">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={user.name} />}
            <AvatarFallback className="text-lg">
              {initials || "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">Dr. {user.name}</p>
            <p className="text-muted-foreground text-sm">{user.email}</p>
            <p className="text-muted-foreground text-xs">
              License #{doctor.licenseNumber}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onAvatarSelected}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera />
              {isUploading ? "Uploading..." : "Change photo"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Practice Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...practiceForm}>
            <form
              onSubmit={practiceForm.handleSubmit(onSavePractice)}
              className="flex flex-col gap-4"
            >
              <FormField
                control={practiceForm.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={practiceForm.control}
                  name="experienceYears"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Years of experience</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={practiceForm.control}
                  name="consultationFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consultation fee</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={practiceForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormLabel className="mb-2">Specializations</FormLabel>
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

              <Button
                type="submit"
                disabled={isSavingPractice}
                className="w-fit"
              >
                {isSavingPractice ? "Saving..." : "Save"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Availability</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {availability.map((slot) => (
            <div
              key={slot.day}
              className="flex flex-wrap items-center gap-3 text-sm"
            >
              <label className="flex w-24 items-center gap-2 font-medium">
                <Checkbox
                  checked={slot.isAvailable}
                  onCheckedChange={(checked) =>
                    updateSlot(slot.day, { isAvailable: checked === true })
                  }
                />
                {slot.day}
              </label>
              <Input
                type="time"
                className="w-32"
                value={slot.startTime}
                disabled={!slot.isAvailable}
                onChange={(e) =>
                  updateSlot(slot.day, { startTime: e.target.value })
                }
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="time"
                className="w-32"
                value={slot.endTime}
                disabled={!slot.isAvailable}
                onChange={(e) =>
                  updateSlot(slot.day, { endTime: e.target.value })
                }
              />
            </div>
          ))}
          <Button
            className="mt-2 w-fit"
            disabled={isSavingAvailability}
            onClick={onSaveAvailability}
          >
            {isSavingAvailability ? "Saving..." : "Save availability"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
