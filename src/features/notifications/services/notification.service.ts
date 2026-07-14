import "server-only";
import type { Session } from "@/core/auth/auth";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/core/api/errors";
import { paginationMeta, paginationSkipTake } from "@/core/api/pagination";
import { sendEmail } from "@/core/email/mailer";
import { adminAnnouncementEmail } from "@/core/email/templates";
import { sendSms } from "@/core/sms/twilio";
import * as notificationRepo from "@/features/notifications/repository/notification.repository";
import { listUsersForBroadcast } from "@/features/users/repository/user.repository";
import { findPatientByUserId } from "@/features/patients/repository/patient.repository";
import { findDoctorByUserId } from "@/features/doctors/repository/doctor.repository";
import type { NotificationType, Prisma } from "@/generated/prisma/client";
import type {
  BroadcastNotificationInput,
  CreateNotificationInput,
  ListNotificationsQuery,
} from "@/features/notifications/validation/notification.validation";

type NotifyUserInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
  email?: { to: string; subject: string; html: string };
  sms?: { to: string; body: string };
};

/**
 * Single entry point for cross-channel notifications: always writes the
 * in-app row, then best-effort fans out to email/SMS. A failure on one
 * channel never blocks the others or the caller's request — it's logged and
 * left for the notification-retries cron to pick up (see emailSent/smsSent).
 */
export async function notifyUser(input: NotifyUserInput) {
  const notification = await notificationRepo.createNotification({
    userId: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    metadata: input.metadata,
    channelEmail: !!input.email,
    channelSms: !!input.sms,
  });

  let emailSent = false;
  let smsSent = false;

  if (input.email) {
    try {
      await sendEmail(input.email);
      emailSent = true;
    } catch (error) {
      console.error(
        `[notify] email delivery failed for notification ${notification.id}`,
        error
      );
    }
  }

  if (input.sms) {
    try {
      smsSent = await sendSms(input.sms.to, input.sms.body);
    } catch (error) {
      console.error(
        `[notify] sms delivery failed for notification ${notification.id}`,
        error
      );
    }
  }

  if (emailSent || smsSent) {
    await notificationRepo.updateDeliveryStatus(notification.id, {
      ...(emailSent ? { emailSent: true } : {}),
      ...(smsSent ? { smsSent: true } : {}),
    });
  }

  return notification;
}

const RETRY_WINDOW_HOURS = 24;

/**
 * Re-attempts email/SMS for notifications that were written but whose
 * requested channel(s) never got marked delivered. Intended to be invoked by
 * the /api/cron/notification-retries route, not called directly by request
 * handlers.
 */
export async function retryFailedNotificationsService() {
  const since = new Date(Date.now() - RETRY_WINDOW_HOURS * 60 * 60 * 1000);
  const pending = await notificationRepo.listPendingDeliveries(since);

  let emailRetried = 0;
  let smsRetried = 0;

  for (const notification of pending) {
    if (notification.channelEmail && !notification.emailSent) {
      try {
        await sendEmail({
          to: notification.user.email,
          subject: notification.title,
          html: `<p>${notification.message}</p>`,
        });
        await notificationRepo.updateDeliveryStatus(notification.id, {
          emailSent: true,
        });
        emailRetried += 1;
      } catch (error) {
        console.error(
          `[notify:retry] email retry failed for notification ${notification.id}`,
          error
        );
      }
    }

    if (notification.channelSms && !notification.smsSent) {
      try {
        const patient = await findPatientByUserId(notification.userId);
        const doctor = patient
          ? null
          : await findDoctorByUserId(notification.userId);
        const phone = patient?.phone ?? doctor?.phone;
        if (phone) {
          const sent = await sendSms(phone, notification.message);
          if (sent) {
            await notificationRepo.updateDeliveryStatus(notification.id, {
              smsSent: true,
            });
            smsRetried += 1;
          }
        }
      } catch (error) {
        console.error(
          `[notify:retry] sms retry failed for notification ${notification.id}`,
          error
        );
      }
    }
  }

  return { checked: pending.length, emailRetried, smsRetried };
}

const NOTIFICATION_RETENTION_DAYS = 90;

/** Intended to be invoked by the /api/cron/daily-cleanup route. */
export async function cleanupOldNotificationsService() {
  const before = new Date(
    Date.now() - NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000
  );
  const result = await notificationRepo.deleteOldReadNotifications(before);
  return { deleted: result.count };
}

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

const BROADCAST_RATE_LIMIT = { limit: 5, windowSeconds: 60 };

/**
 * Fans out through notifyUser per recipient (rather than a bulk insert) so
 * each broadcast notification gets the same emailSent/smsSent delivery
 * tracking as any other notification — that's what lets the retry cron pick
 * up broadcasts whose email failed, instead of silently dropping them.
 */
export async function broadcastNotificationService(
  actorId: string,
  input: BroadcastNotificationInput
) {
  const { checkRateLimit } = await import("@/core/security/rate-limit");
  const allowed = await checkRateLimit(
    `broadcast:${actorId}`,
    BROADCAST_RATE_LIMIT.limit,
    BROADCAST_RATE_LIMIT.windowSeconds
  );
  if (!allowed) {
    throw new ConflictError("Too many broadcasts sent. Please wait a moment.");
  }

  const recipients = await listUsersForBroadcast(input.role);
  const { subject, html } = adminAnnouncementEmail(input);

  await Promise.allSettled(
    recipients.map((user) =>
      notifyUser({
        userId: user.id,
        type: "SYSTEM_ANNOUNCEMENT",
        title: input.title,
        message: input.message,
        email: { to: user.email, subject, html },
      })
    )
  );

  return { count: recipients.length };
}
