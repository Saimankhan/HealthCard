import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getUserByIdService } from "@/features/users/services/user.service";
import { EditUserForm } from "@/components/admin/users/edit-user-form";

export const metadata: Metadata = { title: "Edit User - HealthCard Admin" };

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getUserByIdService(id).catch(() => null);
  if (!user) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit User</h1>
        <p className="text-muted-foreground text-sm">
          Update account details for {user.name}.
        </p>
      </div>
      <EditUserForm
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt.toISOString(),
          deletedAt: user.deletedAt ? user.deletedAt.toISOString() : null,
          suspendedAt: user.suspendedAt ? user.suspendedAt.toISOString() : null,
        }}
      />
    </div>
  );
}
