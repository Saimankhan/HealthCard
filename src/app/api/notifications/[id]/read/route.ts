import { withErrorHandling } from "@/core/api/handler";
import { markNotificationReadHandler } from "@/features/notifications/routes/notification.routes";

export const PATCH = withErrorHandling(markNotificationReadHandler);
