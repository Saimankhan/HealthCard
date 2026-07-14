"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLE_OPTIONS = [
  { value: "ALL", label: "Everyone" },
  { value: "PATIENT", label: "Patients" },
  { value: "DOCTOR", label: "Doctors" },
  { value: "ADMIN", label: "Admins" },
];

export function BroadcastForm() {
  const [role, setRole] = useState("ALL");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function onSend() {
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }
    setIsSending(true);
    try {
      const result = await apiFetch<{ sent: number }>(
        "/api/notifications/broadcast",
        {
          method: "POST",
          body: JSON.stringify({
            role: role === "ALL" ? undefined : role,
            title: title.trim(),
            message: message.trim(),
          }),
        }
      );
      toast.success(`Announcement sent to ${result.sent} user(s)`);
      setTitle("");
      setMessage("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to send announcement"
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Broadcast Announcement</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Send to</label>
          <Select value={role} onValueChange={(v) => setRole(v ?? "ALL")}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Message</label>
          <Textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <Button className="w-fit" disabled={isSending} onClick={onSend}>
          <Megaphone />
          {isSending ? "Sending..." : "Send announcement"}
        </Button>
      </CardContent>
    </Card>
  );
}
