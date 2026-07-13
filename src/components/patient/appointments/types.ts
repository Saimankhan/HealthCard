export type AppointmentStatus =
  "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export type AppointmentListItem = {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  reason: string | null;
  notes: string | null;
  cancelledAt: string | null;
  createdAt: string;
  doctor: {
    id: string;
    consultationFee: string | null;
    user: { id: string; name: string; email: string };
  };
  patient: {
    id: string;
    user: { id: string; name: string; email: string };
  };
};
