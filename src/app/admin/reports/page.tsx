import Link from "next/link";
import type { Metadata } from "next";
import {
  HeartPulse,
  Stethoscope,
  CalendarDays,
  CreditCard,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Reports - HealthCard Admin" };

const REPORTS = [
  {
    href: "/admin/reports/patients",
    label: "Patient Reports",
    description: "Demographics, blood groups, and registration trends.",
    icon: HeartPulse,
  },
  {
    href: "/admin/reports/doctors",
    label: "Doctor Reports",
    description: "Specialization mix and top doctors by volume.",
    icon: Stethoscope,
  },
  {
    href: "/admin/reports/appointments",
    label: "Appointment Reports",
    description: "Status breakdown and appointment volume trends.",
    icon: CalendarDays,
  },
  {
    href: "/admin/reports/payments",
    label: "Payment Reports",
    description: "Revenue by status, method, and time.",
    icon: CreditCard,
  },
];

export default function AdminReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-muted-foreground text-sm">
          Analytics across patients, doctors, appointments, and payments.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {REPORTS.map((report) => (
          <Link key={report.href} href={report.href}>
            <Card className="hover:bg-muted/40 transition-colors">
              <CardContent className="flex items-start gap-3 py-5">
                <report.icon className="text-primary size-8 shrink-0" />
                <div>
                  <p className="font-medium">{report.label}</p>
                  <p className="text-muted-foreground text-sm">
                    {report.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
