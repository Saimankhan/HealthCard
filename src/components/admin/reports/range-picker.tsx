import Link from "next/link";

import { Button } from "@/components/ui/button";

const RANGES = [7, 14, 30, 90];

export function RangePicker({
  currentDays,
  basePath,
}: {
  currentDays: number;
  basePath: string;
}) {
  return (
    <div className="flex gap-1">
      {RANGES.map((days) => (
        <Button
          key={days}
          size="sm"
          variant={days === currentDays ? "default" : "outline"}
          render={<Link href={`${basePath}?days=${days}`}>{days}d</Link>}
        />
      ))}
    </div>
  );
}
