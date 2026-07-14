"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Search, UserPlus } from "lucide-react";

import { apiFetch, apiFetchWithMeta } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { EmptyState } from "@/components/patient/section-card";

type Specialization = { id: string; name: string };
type Doctor = {
  id: string;
  licenseNumber: string;
  experienceYears: number | null;
  consultationFee: string | null;
  user: { id: string; name: string; email: string };
  specializations: { specialization: Specialization }[];
};

export function DoctorsList() {
  const [items, setItems] = useState<Doctor[] | null>(null);
  const [search, setSearch] = useState("");
  const [specializationId, setSpecializationId] = useState("ALL");
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Specialization[]>(
      "/api/specializations?pageSize=100&sortOrder=asc"
    )
      .then((data) => setSpecializations(data))
      .catch(() => setSpecializations([]));
  }, []);

  async function load() {
    try {
      const params = new URLSearchParams({ sortOrder: "asc", pageSize: "100" });
      if (search.trim()) params.set("search", search.trim());
      if (specializationId !== "ALL")
        params.set("specializationId", specializationId);

      const { data } = await apiFetchWithMeta<Doctor[]>(
        `/api/doctors?${params.toString()}`
      );
      setItems(data);
    } catch {
      toast.error("Unable to load doctors");
      setItems([]);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, specializationId]);

  async function removeDoctor(id: string) {
    setDeletingId(id);
    try {
      await apiFetch(`/api/doctors/${id}`, { method: "DELETE" });
      toast.success("Doctor removed");
      load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to remove doctor"
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search by name or license..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={specializationId}
            onValueChange={(v) => setSpecializationId(v ?? "ALL")}
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
        </div>
        <Button
          render={
            <Link href="/admin/doctors/new">
              <UserPlus />
              Add doctor
            </Link>
          }
        />
      </div>

      {items === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState message="No doctors found." />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((doctor) => (
            <Card key={doctor.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="font-medium">Dr. {doctor.user.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {doctor.user.email} &middot; License {doctor.licenseNumber}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {doctor.specializations.map((s) => (
                      <Badge key={s.specialization.id} variant="secondary">
                        {s.specialization.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    render={
                      <Link href={`/admin/doctors/${doctor.id}`}>Edit</Link>
                    }
                  />
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deletingId === doctor.id}
                        >
                          Remove
                        </Button>
                      }
                    />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove this doctor?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Dr. {doctor.user.name} will no longer appear as an
                          active doctor.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep it</AlertDialogCancel>
                        <AlertDialogAction
                          disabled={deletingId === doctor.id}
                          onClick={() => removeDoctor(doctor.id)}
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
