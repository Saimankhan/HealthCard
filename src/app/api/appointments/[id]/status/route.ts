import { withErrorHandling } from "@/core/api/handler";
import { updateAppointmentStatusHandler } from "@/features/appointments/routes/appointment.routes";

export const PATCH = withErrorHandling(updateAppointmentStatusHandler);
