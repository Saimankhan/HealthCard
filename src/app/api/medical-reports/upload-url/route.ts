import { withErrorHandling } from "@/core/api/handler";
import { requestUploadUrlHandler } from "@/features/medical-reports/routes/medical-report.routes";

export const POST = withErrorHandling(requestUploadUrlHandler);
