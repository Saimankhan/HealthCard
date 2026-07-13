import { withErrorHandling } from "@/core/api/handler";
import { getAppointmentHandler } from "@/features/appointments/routes/appointment.routes";

export const GET = withErrorHandling(getAppointmentHandler);
