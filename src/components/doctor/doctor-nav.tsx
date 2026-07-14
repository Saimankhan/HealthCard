"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
  CalendarDays,
  Users,
  Pill,
  Bell,
} from "lucide-react";

import { cn } from "@/lib/utils";

export const DOCTOR_NAV_ITEMS: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact: boolean;
}[] = [
  {
    href: "/doctor",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/doctor/profile",
    label: "Profile",
    icon: User,
    exact: false,
  },
  {
    href: "/doctor/appointments",
    label: "Appointments",
    icon: CalendarDays,
    exact: false,
  },
  {
    href: "/doctor/patients",
    label: "Patients",
    icon: Users,
    exact: false,
  },
  {
    href: "/doctor/prescriptions",
    label: "Prescriptions",
    icon: Pill,
    exact: false,
  },
  {
    href: "/doctor/notifications",
    label: "Notifications",
    icon: Bell,
    exact: false,
  },
];

export function DoctorNav({
  onNavigate,
  unreadCount,
}: {
  onNavigate?: () => void;
  unreadCount?: number;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {DOCTOR_NAV_ITEMS.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span className="flex items-center gap-2">
              <Icon className="size-4" />
              {item.label}
            </span>
            {item.href === "/doctor/notifications" &&
              !!unreadCount &&
              unreadCount > 0 && (
                <span className="bg-destructive text-destructive-foreground flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
          </Link>
        );
      })}
    </nav>
  );
}
