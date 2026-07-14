import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/core/email/mailer", () => ({
  sendEmail: vi.fn(),
}));
vi.mock("@/core/sms/twilio", () => ({
  sendSms: vi.fn(),
}));
vi.mock("@/core/email/templates", () => ({
  adminAnnouncementEmail: vi.fn(() => ({ subject: "", html: "" })),
}));
vi.mock("@/core/security/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/features/notifications/repository/notification.repository");
vi.mock("@/features/users/repository/user.repository", () => ({
  listUsersForBroadcast: vi.fn(),
}));
vi.mock("@/features/patients/repository/patient.repository", () => ({
  findPatientByUserId: vi.fn(),
}));
vi.mock("@/features/doctors/repository/doctor.repository", () => ({
  findDoctorByUserId: vi.fn(),
}));

import { sendEmail } from "@/core/email/mailer";
import { sendSms } from "@/core/sms/twilio";
import { checkRateLimit } from "@/core/security/rate-limit";
import * as notificationRepo from "@/features/notifications/repository/notification.repository";
import { listUsersForBroadcast } from "@/features/users/repository/user.repository";
import {
  broadcastNotificationService,
  notifyUser,
} from "@/features/notifications/services/notification.service";
import { ConflictError } from "@/core/api/errors";

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(notificationRepo.createNotification).mockResolvedValue({
    id: "notif-1",
  } as never);
  vi.mocked(checkRateLimit).mockResolvedValue(true);
});

describe("notifyUser", () => {
  it("marks emailSent when the email channel succeeds", async () => {
    vi.mocked(sendEmail).mockResolvedValue(undefined as never);

    await notifyUser({
      userId: "user-1",
      type: "GENERAL",
      title: "Hi",
      message: "Hello",
      email: { to: "a@b.com", subject: "s", html: "h" },
    });

    expect(notificationRepo.updateDeliveryStatus).toHaveBeenCalledWith(
      "notif-1",
      { emailSent: true }
    );
  });

  it("does not throw and does not mark delivery when the email channel fails", async () => {
    vi.mocked(sendEmail).mockRejectedValue(new Error("smtp down"));

    const result = await notifyUser({
      userId: "user-1",
      type: "GENERAL",
      title: "Hi",
      message: "Hello",
      email: { to: "a@b.com", subject: "s", html: "h" },
    });

    expect(result.id).toBe("notif-1");
    expect(notificationRepo.updateDeliveryStatus).not.toHaveBeenCalled();
  });

  it("a failed SMS channel doesn't block a successful email channel", async () => {
    vi.mocked(sendEmail).mockResolvedValue(undefined as never);
    vi.mocked(sendSms).mockRejectedValue(new Error("twilio down"));

    await notifyUser({
      userId: "user-1",
      type: "GENERAL",
      title: "Hi",
      message: "Hello",
      email: { to: "a@b.com", subject: "s", html: "h" },
      sms: { to: "+15550000", body: "hi" },
    });

    expect(notificationRepo.updateDeliveryStatus).toHaveBeenCalledWith(
      "notif-1",
      { emailSent: true }
    );
  });

  it("writes the in-app row even with no email/sms requested", async () => {
    const result = await notifyUser({
      userId: "user-1",
      type: "GENERAL",
      title: "Hi",
      message: "Hello",
    });
    expect(result.id).toBe("notif-1");
    expect(sendEmail).not.toHaveBeenCalled();
    expect(notificationRepo.updateDeliveryStatus).not.toHaveBeenCalled();
  });
});

describe("broadcastNotificationService", () => {
  it("rejects when the rate limit is exceeded", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(false);

    await expect(
      broadcastNotificationService("actor-1", {
        title: "Announcement",
        message: "Hello everyone",
      } as never)
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("fans out to every recipient returned for the target role", async () => {
    vi.mocked(listUsersForBroadcast).mockResolvedValue([
      { id: "u1", email: "u1@e.com" },
      { id: "u2", email: "u2@e.com" },
    ] as never);
    vi.mocked(sendEmail).mockResolvedValue(undefined as never);

    const result = await broadcastNotificationService("actor-1", {
      title: "Announcement",
      message: "Hello everyone",
    } as never);

    expect(result.count).toBe(2);
    expect(notificationRepo.createNotification).toHaveBeenCalledTimes(2);
  });
});
