"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { getInitials } from "@/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminProfileForm({
  admin,
  user,
}: {
  admin: { id: string; department: string | null };
  user: { name: string; email: string; image: string | null; role: string };
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(user.image);
  const [isUploading, setIsUploading] = useState(false);
  const [department, setDepartment] = useState(admin.department ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const initials = getInitials(user.name);

  async function onAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { uploadUrl, fileKey } = await apiFetch<{
        uploadUrl: string;
        fileKey: string;
      }>("/api/users/me/avatar/upload-url", {
        method: "POST",
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Upload to storage failed");

      const updated = await apiFetch<{ image: string | null }>(
        "/api/users/me/avatar",
        { method: "PATCH", body: JSON.stringify({ fileKey }) }
      );

      setAvatarUrl(updated.image);
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to upload photo"
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onSaveDepartment() {
    setIsSaving(true);
    try {
      await apiFetch(`/api/admin/${admin.id}`, {
        method: "PATCH",
        body: JSON.stringify({ department: department || undefined }),
      });
      toast.success("Profile updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex items-center gap-4 py-6">
          <Avatar className="size-16">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={user.name} />}
            <AvatarFallback className="text-lg">
              {initials || "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{user.name}</p>
              <Badge variant="secondary">{user.role.replace("_", " ")}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">{user.email}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onAvatarSelected}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera />
              {isUploading ? "Uploading..." : "Change photo"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Department</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="e.g. Operations"
          />
          <Button
            className="w-fit"
            disabled={isSaving}
            onClick={onSaveDepartment}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
