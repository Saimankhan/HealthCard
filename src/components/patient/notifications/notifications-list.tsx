"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Bell, CalendarDays, CreditCard, FileText } from "lucide-react";

import { apiFetch, apiFetchWithMeta } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/patient/section-card";

type NotificationType =
  | "APPOINTMENT_CONFIRMATION"
  | "APPOINTMENT_REMINDER"
  | "APPOINTMENT_CANCELLED"
  | "PRESCRIPTION_READY"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "MEDICAL_REPORT_READY"
  | "GENERAL";

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

const CATEGORY_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "APPOINTMENT", label: "Appointments" },
  { value: "PAYMENT", label: "Payments" },
  { value: "OTHER", label: "System" },
];

function categoryOf(type: NotificationType): string {
  if (type.startsWith("APPOINTMENT")) return "APPOINTMENT";
  if (type.startsWith("PAYMENT")) return "PAYMENT";
  return "OTHER";
}

function iconFor(type: NotificationType) {
  const category = categoryOf(type);
  if (category === "APPOINTMENT") return CalendarDays;
  if (category === "PAYMENT") return CreditCard;
  if (type === "PRESCRIPTION_READY" || type === "MEDICAL_REPORT_READY")
    return FileText;
  return Bell;
}

export function NotificationsList() {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [filter, setFilter] = useState("ALL");

  async function load() {
    try {
      const { data } = await apiFetchWithMeta<Notification[]>(
        "/api/notifications?sortOrder=desc&pageSize=100"
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
    if (filter === "ALL") return items;
    return items.filter((n) => categoryOf(n.type) === filter);
  }, [items, filter]);

  async function markRead(id: string) {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      setItems(
        (prev) =>
          prev?.map((n) => (n.id === id ? { ...n, isRead: true } : n)) ?? null
      );
    } catch {
      toast.error("Unable to mark as read");
    }
  }

  async function markAllRead() {
    try {
      await apiFetch("/api/notifications/read-all", { method: "PATCH" });
      setItems((prev) => prev?.map((n) => ({ ...n, isRead: true })) ?? null);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Unable to mark all as read");
    }
  }

  const hasUnread = items?.some((n) => !n.isRead) ?? false;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v ?? "ALL")}>
          <TabsList>
            {CATEGORY_FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {hasUnread && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {filtered === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState message="No notifications." />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((n) => {
            const Icon = iconFor(n.type);
            return (
              <Card
                key={n.id}
                className={cn(!n.isRead && "border-primary/40 bg-primary/5")}
              >
                <CardContent className="flex items-start gap-3 py-3">
                  <Icon className="text-muted-foreground mt-0.5 size-5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{n.title}</p>
                      <p className="text-muted-foreground shrink-0 text-xs">
                        {formatDateTime(n.createdAt)}
                      </p>
                    </div>
                    <p className="text-muted-foreground text-sm">{n.message}</p>
                    {!n.isRead && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => markRead(n.id)}
                      >
                        Mark as read
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
