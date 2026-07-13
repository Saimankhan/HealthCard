import { withErrorHandling } from "@/core/api/handler";
import {
  createDoctorHandler,
  listDoctorsHandler,
} from "@/features/doctors/routes/doctor.routes";

export const GET = withErrorHandling(listDoctorsHandler);
export const POST = withErrorHandling(createDoctorHandler);
