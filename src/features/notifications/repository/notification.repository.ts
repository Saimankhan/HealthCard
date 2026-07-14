import "server-only";
import { prisma } from "@/core/db/prisma";
import type { NotificationType, Prisma } from "@/generated/prisma/client";

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata,
    },
  });
}

export async function createNotificationsForUsers(input: {
  userIds: string[];
  type: NotificationType;
  title: string;
  message: string;
}) {
  return prisma.notification.createMany({
    data: input.userIds.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      message: input.message,
    })),
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
