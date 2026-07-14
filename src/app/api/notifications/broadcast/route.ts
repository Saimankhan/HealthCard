import { withErrorHandling } from "@/core/api/handler";
import { broadcastNotificationHandler } from "@/features/notifications/routes/notification.routes";

export const POST = withErrorHandling(broadcastNotificationHandler);
