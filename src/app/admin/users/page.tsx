import type { Metadata } from "next";

import { getCurrentSession } from "@/core/auth/rbac";
import { UsersList } from "@/components/admin/users/users-list";

export const metadata: Metadata = { title: "Users - HealthCard Admin" };

export default async function AdminUsersPage() {
  const session = await getCurrentSession();
  if (!session) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-muted-foreground text-sm">
          Manage all user accounts across the platform.
        </p>
      </div>
      <UsersList currentUserRole={session.user.role} />
    </div>
  );
}
