import { withErrorHandling } from "@/core/api/handler";
import {
  createAppointmentHandler,
  listAppointmentsHandler,
} from "@/features/appointments/routes/appointment.routes";

export const GET = withErrorHandling(listAppointmentsHandler);
export const POST = withErrorHandling(createAppointmentHandler);
