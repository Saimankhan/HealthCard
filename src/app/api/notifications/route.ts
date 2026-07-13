import { withErrorHandling } from "@/core/api/handler";
import {
  createNotificationHandler,
  listOwnNotificationsHandler,
} from "@/features/notifications/routes/notification.routes";

export const GET = withErrorHandling(listOwnNotificationsHandler);
export const POST = withErrorHandling(createNotificationHandler);
