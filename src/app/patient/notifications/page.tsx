import type { Metadata } from "next";
import { NotificationsList } from "@/components/patient/notifications/notifications-list";

export const metadata: Metadata = { title: "Notifications - HealthCard" };

export default function NotificationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-muted-foreground text-sm">
          Stay up to date with your appointments, payments, and account
          activity.
        </p>
      </div>
      <NotificationsList />
    </div>
  );
}
