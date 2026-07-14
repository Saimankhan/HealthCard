"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

import { apiFetch, apiFetchWithMeta } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type Entity = {
  id: string;
  name: string;
  description: string | null;
};

export function EntityCrudTable({
  apiPath,
  entityLabel,
}: {
  apiPath: string;
  entityLabel: string;
}) {
  const [items, setItems] = useState<Entity[] | null>(null);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    try {
      const params = new URLSearchParams({ sortOrder: "asc", pageSize: "100" });
      if (search.trim()) params.set("search", search.trim());
      const { data } = await apiFetchWithMeta<Entity[]>(
        `${apiPath}?${params.toString()}`
      );
      setItems(data);
    } catch {
      toast.error(`Unable to load ${entityLabel.toLowerCase()}s`);
      setItems([]);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function openCreate() {
    setEditingId(null);
    setName("");
    setDescription("");
    setDialogOpen(true);
  }

  function openEdit(entity: Entity) {
    setEditingId(entity.id);
    setName(entity.name);
    setDescription(entity.description ?? "");
    setDialogOpen(true);
  }

  async function onSubmit() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setIsSaving(true);
    try {
      if (editingId) {
        await apiFetch(`${apiPath}/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || undefined,
          }),
        });
        toast.success(`${entityLabel} updated`);
      } else {
        await apiFetch(apiPath, {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || undefined,
          }),
        });
        toast.success(`${entityLabel} created`);
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save");
    } finally {
      setIsSaving(false);
    }
  }

  async function onDelete(id: string) {
    setDeletingId(id);
    try {
      await apiFetch(`${apiPath}/${id}`, { method: "DELETE" });
      toast.success(`${entityLabel} deleted`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to delete");
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
            placeholder={`Search ${entityLabel.toLowerCase()}s...`}
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={openCreate}>
          <Plus />
          Add {entityLabel.toLowerCase()}
        </Button>
      </div>

      {items === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState message={`No ${entityLabel.toLowerCase()}s found.`} />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((entity) => (
            <Card key={entity.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="font-medium">{entity.name}</p>
                  {entity.description && (
                    <p className="text-muted-foreground text-sm">
                      {entity.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(entity)}
                  >
                    <Pencil />
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deletingId === entity.id}
                        >
                          <Trash2 />
                        </Button>
                      }
                    />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Delete &quot;{entity.name}&quot;?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep it</AlertDialogCancel>
                        <AlertDialogAction
                          disabled={deletingId === entity.id}
                          onClick={() => onDelete(entity.id)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? `Edit ${entityLabel}` : `Add ${entityLabel}`}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={isSaving} onClick={onSubmit}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
