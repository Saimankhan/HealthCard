import type { Metadata } from "next";

import { CreateUserForm } from "@/components/admin/users/create-user-form";

export const metadata: Metadata = { title: "Create User - HealthCard Admin" };

export default function CreateUserPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Create User</h1>
        <p className="text-muted-foreground text-sm">
          Create a new patient or doctor account.
        </p>
      </div>
      <CreateUserForm />
    </div>
  );
}
