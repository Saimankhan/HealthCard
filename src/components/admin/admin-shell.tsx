"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, LogOut, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

import { signOut } from "@/core/auth/auth-client";
import { getInitials } from "@/lib/format";
import { AdminNav } from "@/components/admin/admin-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type ShellUser = {
  name: string;
  email: string;
  image: string | null;
};

export function AdminShell({
  user,
  unreadCount,
  children,
}: {
  user: ShellUser;
  unreadCount: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = getInitials(user.name);

  async function handleLogout() {
    await signOut();
    toast.success("Logged out");
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-full flex-1">
      {/* Desktop sidebar */}
      <aside className="bg-card hidden w-64 shrink-0 flex-col border-r p-4 md:flex">
        <Link href="/admin" className="mb-6 px-2 text-lg font-semibold">
          HealthCard Admin
        </Link>
        <AdminNav unreadCount={unreadCount} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="bg-background flex h-14 items-center justify-between gap-2 border-b px-4">
          <div className="flex items-center gap-2 md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon">
                    <Menu className="size-5" />
                  </Button>
                }
              />
              <SheetContent side="left" className="w-64 p-4">
                <SheetTitle className="mb-6 px-2 text-lg font-semibold">
                  HealthCard Admin
                </SheetTitle>
                <AdminNav
                  unreadCount={unreadCount}
                  onNavigate={() => setMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>
            <span className="font-semibold">HealthCard Admin</span>
          </div>

          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="flex items-center gap-2 rounded-full">
                    <Avatar className="size-8">
                      {user.image && (
                        <AvatarImage src={user.image} alt={user.name} />
                      )}
                      <AvatarFallback>{initials || "?"}</AvatarFallback>
                    </Avatar>
                  </button>
                }
              />
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  render={
                    <Link href="/admin/profile">
                      <UserIcon />
                      Profile
                    </Link>
                  }
                />
                <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
