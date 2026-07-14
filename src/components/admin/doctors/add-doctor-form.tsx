"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search } from "lucide-react";

import { apiFetch, apiFetchWithMeta } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/patient/section-card";

type UserOption = { id: string; name: string; email: string; role: string };
type Specialization = { id: string; name: string };

export function AddDoctorForm() {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserOption[] | null>(null);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [selectedSpecializationIds, setSelectedSpecializationIds] = useState<
    string[]
  >([]);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [bio, setBio] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<Specialization[]>(
      "/api/specializations?pageSize=100&sortOrder=asc"
    )
      .then((data) => setSpecializations(data))
      .catch(() => setSpecializations([]));
  }, []);

  useEffect(() => {
    if (selectedUser) return;
    const timeout = setTimeout(() => {
      apiFetchWithMeta<UserOption[]>(
        `/api/users?status=ACTIVE&sortOrder=asc&pageSize=20${
          search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ""
        }`
      )
        .then(({ data }) => setUsers(data))
        .catch(() => setUsers([]));
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, selectedUser]);

  function toggleSpecialization(id: string) {
    setSelectedSpecializationIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function onSubmit() {
    if (!selectedUser || !licenseNumber.trim()) {
      toast.error("Select a user and enter a license number");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiFetch("/api/doctors", {
        method: "POST",
        body: JSON.stringify({
          userId: selectedUser.id,
          licenseNumber: licenseNumber.trim(),
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
      toast.success("Doctor added");
      router.push("/admin/doctors");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to add doctor");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!selectedUser) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">
          Select the user account to promote to doctor. If the person
          doesn&apos;t have an account yet, create one first under Users.
        </p>
        <div className="relative max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search users by name or email..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {users === null ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : users.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState message="No matching users found." />
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {users.map((u) => (
              <Card key={u.id}>
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {u.email} &middot; {u.role}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setSelectedUser(u)}>
                    Select
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div>
            <p className="text-muted-foreground text-sm">Selected user</p>
            <p className="font-medium">{selectedUser.name}</p>
            <p className="text-muted-foreground text-sm">
              {selectedUser.email}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedUser(null)}
          >
            Change
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-medium">License number</label>
          <Input
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
          />
        </div>
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
            <label key={spec.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selectedSpecializationIds.includes(spec.id)}
                onCheckedChange={() => toggleSpecialization(spec.id)}
              />
              {spec.name}
            </label>
          ))}
        </div>
      </div>

      <Button className="w-fit" disabled={isSubmitting} onClick={onSubmit}>
        {isSubmitting ? "Adding..." : "Add doctor"}
      </Button>
    </div>
  );
}
