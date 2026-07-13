import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function SectionCard({
  title,
  viewAllHref,
  children,
}: {
  title: string;
  viewAllHref?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        {viewAllHref && (
          <Button
            variant="ghost"
            size="sm"
            render={<Link href={viewAllHref}>View all</Link>}
          />
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">{children}</CardContent>
    </Card>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-muted-foreground py-6 text-center text-sm">{message}</p>
  );
}
