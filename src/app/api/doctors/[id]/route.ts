import { withErrorHandling } from "@/core/api/handler";
import {
  deleteDoctorHandler,
  getDoctorHandler,
  updateDoctorHandler,
} from "@/features/doctors/routes/doctor.routes";

export const GET = withErrorHandling(getDoctorHandler);
export const PATCH = withErrorHandling(updateDoctorHandler);
export const DELETE = withErrorHandling(deleteDoctorHandler);
