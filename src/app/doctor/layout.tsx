import { requirePageRole } from "@/core/auth/rbac";
import { getUserByIdService } from "@/features/users/services/user.service";
import { listOwnNotificationsService } from "@/features/notifications/services/notification.service";
import { DoctorShell } from "@/components/doctor/doctor-shell";

export default async function DoctorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requirePageRole("DOCTOR");

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
    <DoctorShell
      user={{ name: user.name, email: user.email, image: user.image }}
      unreadCount={Number(meta?.total ?? 0)}
    >
      {children}
    </DoctorShell>
  );
}
