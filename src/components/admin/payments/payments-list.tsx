"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Search } from "lucide-react";

import { useListQuery } from "@/hooks/use-list-query";
import { formatCurrency, formatDate, formatEnumLabel } from "@/lib/format";
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
import { StatusBadge } from "@/components/patient/status-badge";
import { EmptyState } from "@/components/patient/section-card";

const STATUS_FILTERS = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "SUCCEEDED", label: "Succeeded" },
  { value: "FAILED", label: "Failed" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "PARTIALLY_REFUNDED", label: "Partially Refunded" },
];

const METHOD_FILTERS = [
  { value: "ALL", label: "All methods" },
  { value: "CARD", label: "Card" },
  { value: "CASH", label: "Cash" },
  { value: "INSURANCE", label: "Insurance" },
];

type PaymentRow = {
  id: string;
  amount: string;
  currency: string;
  status: string;
  method: string;
  createdAt: string;
  patient: { user: { name: string; email: string } };
};

export function AdminPaymentsList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [method, setMethod] = useState("ALL");

  const { items, error } = useListQuery<PaymentRow, Record<string, string>>({
    endpoint: "/api/payments",
    filters: { search, status, method },
    baseParams: { sortOrder: "desc", pageSize: "100" },
  });

  useEffect(() => {
    if (error) toast.error("Unable to load payments");
  }, [error]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search by patient name..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v ?? "ALL")}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={method} onValueChange={(v) => setMethod(v ?? "ALL")}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METHOD_FILTERS.map((f) => (
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
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState message="No payments found." />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((payment) => (
            <Card key={payment.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="font-medium">{payment.patient.user.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {formatDate(payment.createdAt)} &middot;{" "}
                    {formatEnumLabel(payment.method)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <p className="font-medium">
                    {formatCurrency(payment.amount, payment.currency)}
                  </p>
                  <StatusBadge status={payment.status} />
                  <Button
                    variant="outline"
                    size="sm"
                    render={
                      <Link href={`/admin/payments/${payment.id}`}>
                        Details
                      </Link>
                    }
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
