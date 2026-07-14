import type { Metadata } from "next";
import { DoctorNotificationsList } from "@/components/doctor/notifications/notifications-list";

export const metadata: Metadata = { title: "Notifications - HealthCard" };

export default function DoctorNotificationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-muted-foreground text-sm">
          Appointment requests, updates, and account activity.
        </p>
      </div>
      <DoctorNotificationsList />
    </div>
  );
}
