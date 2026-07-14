import "server-only";
import { prisma } from "@/core/db/prisma";
import type { NotificationType, Prisma } from "@/generated/prisma/client";

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
  channelEmail?: boolean;
  channelSms?: boolean;
}) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata,
      channelEmail: input.channelEmail ?? false,
      channelSms: input.channelSms ?? false,
    },
  });
}

export async function updateDeliveryStatus(
  id: string,
  status: { emailSent?: boolean; smsSent?: boolean }
) {
  return prisma.notification.update({ where: { id }, data: status });
}

/**
 * Notifications whose requested channels haven't been marked delivered yet,
 * within a retry window (older failures are assumed permanently undeliverable
 * and left alone rather than retried forever).
 */
export async function listPendingDeliveries(since: Date) {
  return prisma.notification.findMany({
    where: {
      createdAt: { gte: since },
      OR: [
        { channelEmail: true, emailSent: false },
        { channelSms: true, smsSent: false },
      ],
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
}

export async function deleteOldReadNotifications(before: Date) {
  return prisma.notification.deleteMany({
    where: { isRead: true, createdAt: { lt: before } },
  });
}

export async function findNotificationById(id: string) {
  return prisma.notification.findUnique({ where: { id } });
}

export async function listNotifications(params: {
  userId: string;
  skip: number;
  take: number;
  sortOrder: "asc" | "desc";
  isRead?: boolean;
}) {
  const where: Prisma.NotificationWhereInput = {
    userId: params.userId,
    ...(params.isRead !== undefined ? { isRead: params.isRead } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: params.sortOrder },
    }),
    prisma.notification.count({ where }),
  ]);

  return { items, total };
}

export async function markNotificationRead(id: string) {
  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}
