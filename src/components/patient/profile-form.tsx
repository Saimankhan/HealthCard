"use client";

import { useRef, useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const GENDER_OPTIONS = ["MALE", "FEMALE", "OTHER"] as const;
const BLOOD_GROUP_OPTIONS = [
  "A_POSITIVE",
  "A_NEGATIVE",
  "B_POSITIVE",
  "B_NEGATIVE",
  "AB_POSITIVE",
  "AB_NEGATIVE",
  "O_POSITIVE",
  "O_NEGATIVE",
] as const;

const personalInfoSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
});

const healthInfoSchema = z.object({
  dateOfBirth: z.string().optional(),
  gender: z.enum(GENDER_OPTIONS).optional().or(z.literal("")),
  bloodGroup: z.enum(BLOOD_GROUP_OPTIONS).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  emergencyContactName: z.string().trim().max(120).optional().or(z.literal("")),
  emergencyContactPhone: z.string().trim().max(20).optional().or(z.literal("")),
});

type PatientProfile = {
  id: string;
  dateOfBirth: string;
  gender: string | null;
  bloodGroup: string | null;
  phone: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

type UserProfile = {
  name: string;
  email: string;
  image: string | null;
};

export function ProfileForm({
  patient,
  user,
}: {
  patient: PatientProfile;
  user: UserProfile;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(user.image);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [isSavingHealth, setIsSavingHealth] = useState(false);

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const personalForm = useForm<z.infer<typeof personalInfoSchema>>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: { name: user.name },
  });

  const healthForm = useForm<z.infer<typeof healthInfoSchema>>({
    resolver: zodResolver(healthInfoSchema),
    defaultValues: {
      dateOfBirth: patient.dateOfBirth,
      gender: (patient.gender as (typeof GENDER_OPTIONS)[number] | null) ?? "",
      bloodGroup:
        (patient.bloodGroup as (typeof BLOOD_GROUP_OPTIONS)[number] | null) ??
        "",
      phone: patient.phone,
      address: patient.address,
      emergencyContactName: patient.emergencyContactName,
      emergencyContactPhone: patient.emergencyContactPhone,
    },
  });

  async function onSavePersonal(values: z.infer<typeof personalInfoSchema>) {
    setIsSavingPersonal(true);
    try {
      await apiFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify(values),
      });
      toast.success("Personal information updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setIsSavingPersonal(false);
    }
  }

  async function onSaveHealth(values: z.infer<typeof healthInfoSchema>) {
    setIsSavingHealth(true);
    try {
      await apiFetch(`/api/patients/${patient.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          dateOfBirth: values.dateOfBirth || undefined,
          gender: values.gender || undefined,
          bloodGroup: values.bloodGroup || undefined,
          phone: values.phone || undefined,
          address: values.address || undefined,
          emergencyContactName: values.emergencyContactName || undefined,
          emergencyContactPhone: values.emergencyContactPhone || undefined,
        }),
      });
      toast.success("Health information updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setIsSavingHealth(false);
    }
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
            <p className="font-medium">{user.name}</p>
            <p className="text-muted-foreground text-sm">{user.email}</p>
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
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...personalForm}>
            <form
              onSubmit={personalForm.handleSubmit(onSavePersonal)}
              className="flex flex-col gap-4"
            >
              <FormField
                control={personalForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div>
                <FormLabel className="mb-2">Email</FormLabel>
                <Input value={user.email} disabled />
              </div>
              <Button
                type="submit"
                disabled={isSavingPersonal}
                className="w-fit"
              >
                {isSavingPersonal ? "Saving..." : "Save"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Health Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...healthForm}>
            <form
              onSubmit={healthForm.handleSubmit(onSaveHealth)}
              className="flex flex-col gap-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={healthForm.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={healthForm.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {GENDER_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option[0] + option.slice(1).toLowerCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={healthForm.control}
                  name="bloodGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Blood group</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select blood group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BLOOD_GROUP_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={healthForm.control}
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
              <FormField
                control={healthForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={healthForm.control}
                  name="emergencyContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency contact name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={healthForm.control}
                  name="emergencyContactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency contact phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" disabled={isSavingHealth} className="w-fit">
                {isSavingHealth ? "Saving..." : "Save"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
