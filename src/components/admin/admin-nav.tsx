"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  HeartPulse,
  Tags,
  Building2,
  CalendarDays,
  CreditCard,
  BarChart3,
  ScrollText,
  Bell,
} from "lucide-react";

import { cn } from "@/lib/utils";

export const ADMIN_NAV_ITEMS: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact: boolean;
}[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users, exact: false },
  { href: "/admin/doctors", label: "Doctors", icon: Stethoscope, exact: false },
  {
    href: "/admin/patients",
    label: "Patients",
    icon: HeartPulse,
    exact: false,
  },
  {
    href: "/admin/specializations",
    label: "Specializations",
    icon: Tags,
    exact: false,
  },
  {
    href: "/admin/departments",
    label: "Departments",
    icon: Building2,
    exact: false,
  },
  {
    href: "/admin/appointments",
    label: "Appointments",
    icon: CalendarDays,
    exact: false,
  },
  {
    href: "/admin/payments",
    label: "Payments",
    icon: CreditCard,
    exact: false,
  },
  { href: "/admin/reports", label: "Reports", icon: BarChart3, exact: false },
  {
    href: "/admin/audit-logs",
    label: "Audit Logs",
    icon: ScrollText,
    exact: false,
  },
  {
    href: "/admin/notifications",
    label: "Notifications",
    icon: Bell,
    exact: false,
  },
];

export function AdminNav({
  onNavigate,
  unreadCount,
}: {
  onNavigate?: () => void;
  unreadCount?: number;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {ADMIN_NAV_ITEMS.map((item) => {
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
            {item.href === "/admin/notifications" &&
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
