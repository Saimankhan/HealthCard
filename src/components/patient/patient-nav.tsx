"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
  CalendarDays,
  Pill,
  ClipboardList,
  IdCard,
  FolderOpen,
  Receipt,
  Bell,
} from "lucide-react";

import { cn } from "@/lib/utils";

export const PATIENT_NAV_ITEMS: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact: boolean;
}[] = [
  {
    href: "/patient",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/patient/profile",
    label: "Profile",
    icon: User,
    exact: false,
  },
  {
    href: "/patient/appointments",
    label: "Appointments",
    icon: CalendarDays,
    exact: false,
  },
  {
    href: "/patient/prescriptions",
    label: "Prescriptions",
    icon: Pill,
    exact: false,
  },
  {
    href: "/patient/medical-history",
    label: "Medical History",
    icon: ClipboardList,
    exact: false,
  },
  {
    href: "/patient/health-card",
    label: "Health Card",
    icon: IdCard,
    exact: false,
  },
  {
    href: "/patient/medical-reports",
    label: "Medical Reports",
    icon: FolderOpen,
    exact: false,
  },
  {
    href: "/patient/payments",
    label: "Payments",
    icon: Receipt,
    exact: false,
  },
  {
    href: "/patient/notifications",
    label: "Notifications",
    icon: Bell,
    exact: false,
  },
];

export function PatientNav({
  onNavigate,
  unreadCount,
}: {
  onNavigate?: () => void;
  unreadCount?: number;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {PATIENT_NAV_ITEMS.map((item) => {
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
            {item.href === "/patient/notifications" &&
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
