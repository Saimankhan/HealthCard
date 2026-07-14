"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Search, Download, Trash2, Plus } from "lucide-react";

import { apiFetch, apiFetchWithMeta } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { downloadPrescriptionPdf } from "@/lib/prescription-pdf";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import type { PrescriptionListItem } from "@/components/patient/prescriptions/types";

export function DoctorPrescriptionsList() {
  const [items, setItems] = useState<PrescriptionListItem[] | null>(null);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    try {
      const { data } = await apiFetchWithMeta<PrescriptionListItem[]>(
        "/api/prescriptions?sortOrder=desc&pageSize=50"
      );
      setItems(data);
    } catch {
      setItems([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!items) return null;
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((rx) => {
      const patientMatch = rx.patient.user.name.toLowerCase().includes(query);
      const medMatch = rx.medications.some((m) =>
        m.name.toLowerCase().includes(query)
      );
      return patientMatch || medMatch;
    });
  }, [items, search]);

  async function deletePrescription(id: string) {
    setDeletingId(id);
    try {
      await apiFetch(`/api/prescriptions/${id}`, { method: "DELETE" });
      toast.success("Prescription deleted");
      load();
    } catch {
      toast.error("Unable to delete prescription");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search by patient or medication..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          render={
            <Link href="/doctor/prescriptions/new">
              <Plus />
              New prescription
            </Link>
          }
        />
      </div>

      {filtered === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState message="No prescriptions found." />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((rx) => (
            <Card key={rx.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="font-medium">{rx.patient.user.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {formatDate(rx.issuedAt)} &middot; {rx.medications.length}{" "}
                    medication(s)
                  </p>
                  <p className="text-muted-foreground truncate text-sm">
                    {rx.medications.map((m) => m.name).join(", ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    render={
                      <Link href={`/doctor/prescriptions/${rx.id}`}>Edit</Link>
                    }
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadPrescriptionPdf(rx)}
                  >
                    <Download />
                    PDF
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button variant="destructive" size="sm">
                          <Trash2 />
                        </Button>
                      }
                    />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Delete this prescription?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep it</AlertDialogCancel>
                        <AlertDialogAction
                          disabled={deletingId === rx.id}
                          onClick={() => deletePrescription(rx.id)}
                        >
                          Delete
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
