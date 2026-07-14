import type { Metadata } from "next";

import { getCurrentSession } from "@/core/auth/rbac";
import { getOwnAdminProfileService } from "@/features/admin/services/admin.service";
import { getUserByIdService } from "@/features/users/services/user.service";
import { AdminProfileForm } from "@/components/admin/profile-form";

export const metadata: Metadata = { title: "Profile - HealthCard Admin" };

export default async function AdminProfilePage() {
  const session = await getCurrentSession();
  if (!session) return null;

  const [admin, user] = await Promise.all([
    getOwnAdminProfileService(session),
    getUserByIdService(session.user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-muted-foreground text-sm">
          Your administrator account details.
        </p>
      </div>

      <AdminProfileForm
        admin={{ id: admin.id, department: admin.department }}
        user={{
          name: user.name,
          email: user.email,
          image: user.image,
          role: session.user.role,
        }}
      />
    </div>
  );
}
