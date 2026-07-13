import "server-only";
import type { Session } from "@/core/auth/auth";
import { ForbiddenError, NotFoundError } from "@/core/api/errors";
import { paginationMeta, paginationSkipTake } from "@/core/api/pagination";
import * as notificationRepo from "@/features/notifications/repository/notification.repository";
import type {
  CreateNotificationInput,
  ListNotificationsQuery,
} from "@/features/notifications/validation/notification.validation";

export async function listOwnNotificationsService(
  session: Session,
  query: ListNotificationsQuery
) {
  const { skip, take } = paginationSkipTake(query);
  const { items, total } = await notificationRepo.listNotifications({
    userId: session.user.id,
    skip,
    take,
    sortOrder: query.sortOrder,
    isRead: query.isRead,
  });
  return { items, meta: paginationMeta(query, total) };
}

export async function createNotificationService(
  input: CreateNotificationInput
) {
  return notificationRepo.createNotification(input);
}

export async function markNotificationReadService(
  session: Session,
  id: string
) {
  const notification = await notificationRepo.findNotificationById(id);
  if (!notification) throw new NotFoundError("Notification");
  if (notification.userId !== session.user.id) throw new ForbiddenError();

  return notificationRepo.markNotificationRead(id);
}

export async function markAllNotificationsReadService(session: Session) {
  return notificationRepo.markAllNotificationsRead(session.user.id);
}
