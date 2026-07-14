"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { useListQuery } from "@/hooks/use-list-query";
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

const APPOINTMENT_STATUS_FILTERS = [
  { value: "ALL", label: "Any appointment status" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No Show" },
];

type PatientListItem = {
  id: string;
  gender: string | null;
  bloodGroup: string | null;
  phone: string | null;
  user: { id: string; name: string; email: string };
};

type DoctorOption = { id: string; user: { name: string } };

export function PatientsList({
  basePath = "/doctor/patients",
  showAdvancedFilters = false,
}: {
  basePath?: string;
  /** Doctor + appointment-status filters only make sense for admins browsing all patients. */
  showAdvancedFilters?: boolean;
} = {}) {
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("ALL");
  const [bloodGroup, setBloodGroup] = useState("ALL");
  const [doctorId, setDoctorId] = useState("ALL");
  const [appointmentStatus, setAppointmentStatus] = useState("ALL");
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);

  useEffect(() => {
    if (!showAdvancedFilters) return;
    apiFetch<DoctorOption[]>("/api/doctors?pageSize=100&sortOrder=asc")
      .then(setDoctors)
      .catch(() => setDoctors([]));
  }, [showAdvancedFilters]);

  const { items } = useListQuery<PatientListItem, Record<string, string>>({
    endpoint: "/api/patients",
    filters: showAdvancedFilters
      ? { search, gender, bloodGroup, doctorId, appointmentStatus }
      : { search, gender, bloodGroup },
    baseParams: { sortOrder: "asc", pageSize: "100" },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search by name, email, phone, or card number..."
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
        {showAdvancedFilters && (
          <>
            <Select
              value={doctorId}
              onValueChange={(v) => setDoctorId(v ?? "ALL")}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Any doctor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Any doctor</SelectItem>
                {doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    Dr. {d.user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={appointmentStatus}
              onValueChange={(v) => setAppointmentStatus(v ?? "ALL")}
            >
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPOINTMENT_STATUS_FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
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
            <EmptyState message="No patients found." />
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
