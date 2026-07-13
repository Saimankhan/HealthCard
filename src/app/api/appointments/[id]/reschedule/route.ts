import { withErrorHandling } from "@/core/api/handler";
import { rescheduleAppointmentHandler } from "@/features/appointments/routes/appointment.routes";

export const PATCH = withErrorHandling(rescheduleAppointmentHandler);
