import { Badge } from "@/components/ui/badge";

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  // Appointment
  PENDING: "secondary",
  CONFIRMED: "default",
  COMPLETED: "outline",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
  // Payment
  SUCCEEDED: "default",
  FAILED: "destructive",
  REFUNDED: "outline",
  PARTIALLY_REFUNDED: "outline",
  // Health card
  ACTIVE: "default",
  EXPIRED: "secondary",
  REVOKED: "destructive",
  // User account status
  SUSPENDED: "destructive",
  DELETED: "destructive",
};

function formatStatusLabel(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANTS[status] ?? "secondary"}>
      {formatStatusLabel(status)}
    </Badge>
  );
}
