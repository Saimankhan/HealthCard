"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { apiFetchWithMeta } from "@/lib/api-client";
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
import { EmptyState } from "@/components/patient/section-card";

const GENDER_FILTERS = [
  { value: "ALL", label: "All genders" },
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
];

const BLOOD_GROUP_FILTERS = [
  { value: "ALL", label: "All blood groups" },
  { value: "A_POSITIVE", label: "A+" },
  { value: "A_NEGATIVE", label: "A-" },
  { value: "B_POSITIVE", label: "B+" },
  { value: "B_NEGATIVE", label: "B-" },
  { value: "AB_POSITIVE", label: "AB+" },
  { value: "AB_NEGATIVE", label: "AB-" },
  { value: "O_POSITIVE", label: "O+" },
  { value: "O_NEGATIVE", label: "O-" },
];

type PatientListItem = {
  id: string;
  gender: string | null;
  bloodGroup: string | null;
  phone: string | null;
  user: { id: string; name: string; email: string };
};

export function PatientsList({
  basePath = "/doctor/patients",
}: {
  basePath?: string;
} = {}) {
  const [items, setItems] = useState<PatientListItem[] | null>(null);
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("ALL");
  const [bloodGroup, setBloodGroup] = useState("ALL");

  async function load() {
    setItems(null);
    try {
      const params = new URLSearchParams({
        sortOrder: "asc",
        pageSize: "100",
      });
      if (search.trim()) params.set("search", search.trim());
      if (gender !== "ALL") params.set("gender", gender);
      if (bloodGroup !== "ALL") params.set("bloodGroup", bloodGroup);

      const { data } = await apiFetchWithMeta<PatientListItem[]>(
        `/api/patients?${params.toString()}`
      );
      setItems(data);
    } catch {
      setItems([]);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, gender, bloodGroup]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search by name or email..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={gender} onValueChange={(v) => setGender(v ?? "ALL")}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GENDER_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={bloodGroup}
          onValueChange={(v) => setBloodGroup(v ?? "ALL")}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BLOOD_GROUP_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {items === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState message="No assigned patients found." />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((patient) => (
            <Card key={patient.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="font-medium">{patient.user.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {patient.user.email}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  render={
                    <Link href={`${basePath}/${patient.id}`}>View profile</Link>
                  }
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
