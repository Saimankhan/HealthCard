import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, IdCard, ShieldCheck } from "lucide-react";

import { getCurrentSession } from "@/core/auth/rbac";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function Home() {
  const session = await getCurrentSession();

  if (session?.user.role === "PATIENT") {
    redirect("/patient");
  }

  if (session) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Card className="max-w-sm">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <h1 className="text-lg font-semibold">
              Welcome, {session.user.name}
            </h1>
            <p className="text-muted-foreground text-sm">
              The {session.user.role.toLowerCase()} portal isn&apos;t available
              yet. Check back soon.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-12 p-8">
      <div className="flex max-w-xl flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">HealthCard</h1>
        <p className="text-muted-foreground text-lg">
          Book appointments, manage prescriptions, and carry your digital health
          card &mdash; all in one place.
        </p>
        <div className="mt-2 flex gap-3">
          <Button
            size="lg"
            render={<Link href="/register">Get started</Link>}
          />
          <Button
            size="lg"
            variant="outline"
            render={<Link href="/login">Log in</Link>}
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div className="flex flex-col items-center gap-2 text-center">
          <CalendarDays className="text-primary size-8" />
          <p className="font-medium">Book appointments</p>
          <p className="text-muted-foreground text-sm">
            Find doctors by specialization and book in minutes.
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <IdCard className="text-primary size-8" />
          <p className="font-medium">Digital HealthCard</p>
          <p className="text-muted-foreground text-sm">
            Your medical identity, always with you.
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <ShieldCheck className="text-primary size-8" />
          <p className="font-medium">Secure by design</p>
          <p className="text-muted-foreground text-sm">
            Your health data, protected end to end.
          </p>
        </div>
      </div>
    </div>
  );
}
