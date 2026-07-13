"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Download } from "lucide-react";

import { apiFetchWithMeta } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { downloadPrescriptionPdf } from "@/lib/prescription-pdf";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/patient/section-card";
import type { PrescriptionListItem } from "@/components/patient/prescriptions/types";

export function PrescriptionsList() {
  const [items, setItems] = useState<PrescriptionListItem[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiFetchWithMeta<PrescriptionListItem[]>(
      "/api/prescriptions?sortOrder=desc&pageSize=50"
    )
      .then(({ data }) => setItems(data))
      .catch(() => setItems([]));
  }, []);

  const filtered = useMemo(() => {
    if (!items) return null;
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((rx) => {
      const doctorMatch = rx.doctor.user.name.toLowerCase().includes(query);
      const medMatch = rx.medications.some((m) =>
        m.name.toLowerCase().includes(query)
      );
      return doctorMatch || medMatch;
    });
  }, [items, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search by doctor or medication..."
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
                  <p className="font-medium">Dr. {rx.doctor.user.name}</p>
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
                      <Link href={`/patient/prescriptions/${rx.id}`}>View</Link>
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
