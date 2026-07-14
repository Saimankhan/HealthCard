"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Search, UserPlus } from "lucide-react";

import { apiFetch, apiFetchWithMeta } from "@/lib/api-client";
import { formatEnumLabel } from "@/lib/format";
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
import { StatusBadge } from "@/components/patient/status-badge";
import { EmptyState } from "@/components/patient/section-card";

const ROLE_FILTERS = [
  { value: "ALL", label: "All roles" },
  { value: "PATIENT", label: "Patient" },
  { value: "DOCTOR", label: "Doctor" },
  { value: "ADMIN", label: "Admin" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
];

const STATUS_FILTERS = [
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "DELETED", label: "Deleted" },
  { value: "ALL", label: "All statuses" },
];

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  deletedAt: string | null;
  suspendedAt: string | null;
};

function statusOf(user: UserRow) {
  if (user.deletedAt) return "DELETED";
  if (user.suspendedAt) return "SUSPENDED";
  return "ACTIVE";
}

export function UsersList({ currentUserRole }: { currentUserRole: string }) {
  const [items, setItems] = useState<UserRow[] | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ACTIVE");
  const [actingId, setActingId] = useState<string | null>(null);

  async function load() {
    try {
      const params = new URLSearchParams({
        sortOrder: "desc",
        pageSize: "100",
        status,
      });
      if (search.trim()) params.set("search", search.trim());
      if (role !== "ALL") params.set("role", role);

      const { data } = await apiFetchWithMeta<UserRow[]>(
        `/api/users?${params.toString()}`
      );
      setItems(data);
    } catch {
      toast.error("Unable to load users");
      setItems([]);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, role, status]);

  async function performAction(id: string, action: string) {
    setActingId(id);
    try {
      await apiFetch(`/api/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      toast.success("User updated");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to update user");
    } finally {
      setActingId(null);
    }
  }

  async function changeRole(id: string, newRole: string) {
    setActingId(id);
    try {
      await apiFetch(`/api/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });
      toast.success("Role updated");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to update role");
    } finally {
      setActingId(null);
    }
  }

  const canGrantAdminRoles = currentUserRole === "SUPER_ADMIN";
  const roleOptions = canGrantAdminRoles
    ? ["PATIENT", "DOCTOR", "ADMIN", "SUPER_ADMIN"]
    : ["PATIENT", "DOCTOR"];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
          <Select value={role} onValueChange={(v) => setRole(v ?? "ALL")}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v ?? "ACTIVE")}
          >
            <SelectTrigger className="w-40">
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
        </div>
        <Button
          render={
            <Link href="/admin/users/new">
              <UserPlus />
              Create user
            </Link>
          }
        />
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
            <EmptyState message="No users found." />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((user) => {
            const userStatus = statusOf(user);
            const busy = actingId === user.id;
            return (
              <Card key={user.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.name}</p>
                      <StatusBadge status={userStatus} />
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {user.email}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Select
                      value={user.role}
                      onValueChange={(v) => v && changeRole(user.id, v)}
                      disabled={busy}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((r) => (
                          <SelectItem key={r} value={r}>
                            {formatEnumLabel(r)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      render={
                        <Link href={`/admin/users/${user.id}`}>Edit</Link>
                      }
                    />
                    {userStatus === "DELETED" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => performAction(user.id, "RESTORE")}
                      >
                        Restore
                      </Button>
                    ) : (
                      <>
                        {userStatus === "SUSPENDED" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() => performAction(user.id, "UNSUSPEND")}
                          >
                            Unsuspend
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() => performAction(user.id, "SUSPEND")}
                          >
                            Suspend
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={busy}
                              >
                                Delete
                              </Button>
                            }
                          />
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete this user?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {user.name} will lose access immediately. This
                                can be undone later via Restore.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep it</AlertDialogCancel>
                              <AlertDialogAction
                                disabled={busy}
                                onClick={() => performAction(user.id, "DELETE")}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
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
