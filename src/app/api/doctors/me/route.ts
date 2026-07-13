import { withErrorHandling } from "@/core/api/handler";
import { getOwnDoctorProfileHandler } from "@/features/doctors/routes/doctor.routes";

export const GET = withErrorHandling(getOwnDoctorProfileHandler);
