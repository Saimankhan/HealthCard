import { requirePageRole } from "@/core/auth/rbac";
import { ADMIN_ROLES } from "@/core/auth/roles";
import { getUserByIdService } from "@/features/users/services/user.service";
import { listOwnNotificationsService } from "@/features/notifications/services/notification.service";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requirePageRole(...ADMIN_ROLES);

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
    <AdminShell
      user={{ name: user.name, email: user.email, image: user.image }}
      unreadCount={Number(meta?.total ?? 0)}
    >
      {children}
    </AdminShell>
  );
}
