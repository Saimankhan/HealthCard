import { withErrorHandling } from "@/core/api/handler";
import { markAllNotificationsReadHandler } from "@/features/notifications/routes/notification.routes";

export const PATCH = withErrorHandling(markAllNotificationsReadHandler);
