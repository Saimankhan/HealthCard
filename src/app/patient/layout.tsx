import { redirect } from "next/navigation";

import { getCurrentSession } from "@/core/auth/rbac";
import { getUserByIdService } from "@/features/users/services/user.service";
import { listOwnNotificationsService } from "@/features/notifications/services/notification.service";
import { PatientShell } from "@/components/patient/patient-shell";

export default async function PatientLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }
  if (session.user.role !== "PATIENT") {
    redirect("/");
  }

  const [user, { meta }] = await Promise.all([
    getUserByIdService(session.user.id),
    listOwnNotificationsService(session, {
      page: 1,
      pageSize: 1,
      sortOrder: "desc",
      isRead: false,
    }),
  ]);

  return (
    <PatientShell
      user={{ name: user.name, email: user.email, image: user.image }}
      unreadCount={Number(meta?.total ?? 0)}
    >
      {children}
    </PatientShell>
  );
}
