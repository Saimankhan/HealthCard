import type { Metadata } from "next";

import { BroadcastForm } from "@/components/admin/broadcast-form";
import { DoctorNotificationsList } from "@/components/doctor/notifications/notifications-list";

export const metadata: Metadata = { title: "Notifications - HealthCard Admin" };

export default function AdminNotificationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-muted-foreground text-sm">
          View your notifications and broadcast announcements.
        </p>
      </div>
      <BroadcastForm />
      <DoctorNotificationsList />
    </div>
  );
}
