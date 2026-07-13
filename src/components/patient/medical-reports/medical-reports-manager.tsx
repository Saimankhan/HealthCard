"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Trash2, Upload } from "lucide-react";

import { apiFetch, apiFetchWithMeta } from "@/lib/api-client";
import { formatDate, formatEnumLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const CATEGORY_OPTIONS = [
  "LAB_RESULT",
  "IMAGING",
  "DISCHARGE_SUMMARY",
  "PRESCRIPTION_SCAN",
  "OTHER",
] as const;

type MedicalReport = {
  id: string;
  title: string;
  category: (typeof CATEGORY_OPTIONS)[number];
  fileType: string | null;
  uploadedAt: string;
};

export function MedicalReportsManager({ patientId }: { patientId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reports, setReports] = useState<MedicalReport[] | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] =
    useState<(typeof CATEGORY_OPTIONS)[number]>("OTHER");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function load() {
    try {
      const { data } = await apiFetchWithMeta<MedicalReport[]>(
        `/api/medical-reports?patientId=${patientId}&sortOrder=desc&pageSize=50`
      );
      setReports(data);
    } catch {
      setReports([]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setTitle(file.name.replace(/\.[^.]+$/, ""));
    setCategory("OTHER");
    setDialogOpen(true);
  }

  async function submitUpload() {
    if (!pendingFile || !title.trim()) {
      toast.error("Give the report a title");
      return;
    }
    setIsUploading(true);
    try {
      const { uploadUrl, fileKey } = await apiFetch<{
        uploadUrl: string;
        fileKey: string;
      }>("/api/medical-reports/upload-url", {
        method: "POST",
        body: JSON.stringify({
          patientId,
          fileName: pendingFile.name,
          contentType: pendingFile.type || "application/octet-stream",
        }),
      });

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": pendingFile.type || "application/octet-stream",
        },
        body: pendingFile,
      });
      if (!uploadRes.ok) throw new Error("Upload to storage failed");

      await apiFetch("/api/medical-reports", {
        method: "POST",
        body: JSON.stringify({
          patientId,
          title: title.trim(),
          category,
          fileKey,
          fileType: pendingFile.type || undefined,
          fileSize: pendingFile.size,
        }),
      });

      toast.success("Report uploaded");
      setDialogOpen(false);
      setPendingFile(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function downloadReport(id: string) {
    setDownloadingId(id);
    try {
      const data = await apiFetch<{ downloadUrl: string }>(
        `/api/medical-reports/${id}`
      );
      window.open(data.downloadUrl, "_blank");
    } catch {
      toast.error("Unable to download report");
    } finally {
      setDownloadingId(null);
    }
  }

  async function deleteReport(id: string) {
    setDeletingId(id);
    try {
      await apiFetch(`/api/medical-reports/${id}`, { method: "DELETE" });
      toast.success("Report deleted");
      load();
    } catch {
      toast.error("Unable to delete report");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={onFileSelected}
        />
        <Button onClick={() => fileInputRef.current?.click()}>
          <Upload />
          Upload report
        </Button>
      </div>

      {reports === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState message="No medical reports uploaded yet." />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{report.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary">
                      {formatEnumLabel(report.category)}
                    </Badge>
                    <p className="text-muted-foreground text-xs">
                      {formatDate(report.uploadedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={downloadingId === report.id}
                    onClick={() => downloadReport(report.id)}
                  >
                    <Download />
                    Download
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
                        <AlertDialogTitle>Delete this report?</AlertDialogTitle>
                        <AlertDialogDescription>
                          &quot;{report.title}&quot; will be permanently
                          removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep it</AlertDialogCancel>
                        <AlertDialogAction
                          disabled={deletingId === report.id}
                          onClick={() => deleteReport(report.id)}
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
            <DialogTitle>Upload medical report</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={category}
                onValueChange={(value) =>
                  setCategory((value as typeof category) ?? "OTHER")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {formatEnumLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {pendingFile && (
              <p className="text-muted-foreground text-sm">
                File: {pendingFile.name}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button disabled={isUploading} onClick={submitUpload}>
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
