import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/core/cache/cache", () => ({
  getOrSetCache: vi.fn((_key: string, _ttl: number, fetcher: () => unknown) =>
    fetcher()
  ),
  invalidateCache: vi.fn(),
  CACHE_TTL: { appointments: 60 },
}));
vi.mock("@/features/reports/services/report.service", () => ({
  DASHBOARD_CACHE_INVALIDATION_DAYS: [14, 30],
  dashboardAggregatesCacheKey: (days: number) =>
    `cache:dashboard:overview:${days}`,
}));
vi.mock("@/core/email/templates", () => ({
  appointmentCancellationEmail: vi.fn(() => ({ subject: "", html: "" })),
  appointmentConfirmationEmail: vi.fn(() => ({ subject: "", html: "" })),
  appointmentReminderEmail: vi.fn(() => ({ subject: "", html: "" })),
}));
vi.mock("@/core/sms/templates", () => ({
  appointmentCancellationSms: vi.fn(() => ""),
  appointmentConfirmationSms: vi.fn(() => ""),
  appointmentReminderSms: vi.fn(() => ""),
}));
vi.mock("@/features/audit-logs/services/audit-log.service", () => ({
  writeAuditLog: vi.fn(),
}));
vi.mock("@/features/notifications/repository/notification.repository", () => ({
  createNotification: vi.fn(),
}));
vi.mock("@/features/notifications/services/notification.service", () => ({
  notifyUser: vi.fn(),
}));
vi.mock("@/features/appointments/repository/appointment.repository");
vi.mock("@/features/patients/repository/patient.repository");
vi.mock("@/features/doctors/repository/doctor.repository");
vi.mock("@/features/payments/repository/payment.repository", () => ({
  createPayment: vi.fn(),
}));

import * as appointmentRepo from "@/features/appointments/repository/appointment.repository";
import * as doctorRepo from "@/features/doctors/repository/doctor.repository";
import * as patientRepo from "@/features/patients/repository/patient.repository";
import {
  createAppointmentService,
  rescheduleAppointmentService,
  updateAppointmentStatusService,
} from "@/features/appointments/services/appointment.service";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
} from "@/core/api/errors";
import type { Session } from "@/core/auth/auth";

function makeSession(role: string, userId = "user-1"): Session {
  return { user: { id: userId, role } } as unknown as Session;
}

function makeAppointment(overrides: Record<string, unknown> = {}) {
  return {
    id: "appt-1",
    patientId: "patient-1",
    doctorId: "doctor-1",
    scheduledAt: new Date(Date.now() + 60 * 60 * 1000),
    durationMinutes: 30,
    status: "PENDING",
    reason: null,
    patient: {
      userId: "patient-user-1",
      user: { name: "Pat", email: "p@e.com" },
    },
    doctor: {
      userId: "doctor-user-1",
      user: { name: "Doc", email: "d@e.com" },
    },
    ...overrides,
  } as unknown as NonNullable<
    Awaited<ReturnType<typeof appointmentRepo.findAppointmentById>>
  >;
}

const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(patientRepo.findPatientByUserId).mockResolvedValue({
    id: "patient-1",
  } as never);
});

describe("createAppointmentService", () => {
  it("rejects a booking that overlaps an existing active appointment", async () => {
    vi.mocked(doctorRepo.findDoctorById).mockResolvedValue({
      id: "doctor-1",
      consultationFee: null,
    } as never);
    vi.mocked(
      appointmentRepo.findActiveAppointmentsForDoctorInRange
    ).mockResolvedValue([
      {
        scheduledAt: futureDate,
        durationMinutes: 30,
      } as never,
    ]);

    await expect(
      createAppointmentService(makeSession("PATIENT"), {
        doctorId: "doctor-1",
        scheduledAt: futureDate,
        durationMinutes: 30,
      })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("books successfully when there is no overlap", async () => {
    vi.mocked(doctorRepo.findDoctorById).mockResolvedValue({
      id: "doctor-1",
      consultationFee: null,
    } as never);
    vi.mocked(
      appointmentRepo.findActiveAppointmentsForDoctorInRange
    ).mockResolvedValue([]);
    vi.mocked(appointmentRepo.createAppointment).mockResolvedValue(
      makeAppointment()
    );

    const appointment = await createAppointmentService(makeSession("PATIENT"), {
      doctorId: "doctor-1",
      scheduledAt: futureDate,
      durationMinutes: 30,
    });

    expect(appointment.id).toBe("appt-1");
  });

  it("rejects scheduling in the past", async () => {
    vi.mocked(doctorRepo.findDoctorById).mockResolvedValue({
      id: "doctor-1",
      consultationFee: null,
    } as never);

    await expect(
      createAppointmentService(makeSession("PATIENT"), {
        doctorId: "doctor-1",
        scheduledAt: new Date(Date.now() - 60_000),
        durationMinutes: 30,
      })
    ).rejects.toBeInstanceOf(BadRequestError);
  });
});

describe("updateAppointmentStatusService", () => {
  it("allows a valid PENDING -> CONFIRMED transition by an admin", async () => {
    vi.mocked(appointmentRepo.findAppointmentById).mockResolvedValue(
      makeAppointment({ status: "PENDING" })
    );
    vi.mocked(appointmentRepo.updateAppointmentStatus).mockResolvedValue(
      makeAppointment({ status: "CONFIRMED" })
    );

    const updated = await updateAppointmentStatusService(
      makeSession("ADMIN"),
      "appt-1",
      "CONFIRMED"
    );

    expect(updated.status).toBe("CONFIRMED");
  });

  it("rejects an illegal transition (COMPLETED -> PENDING)", async () => {
    vi.mocked(appointmentRepo.findAppointmentById).mockResolvedValue(
      makeAppointment({ status: "COMPLETED" })
    );

    await expect(
      updateAppointmentStatusService(makeSession("ADMIN"), "appt-1", "PENDING")
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("only allows a patient to cancel, not confirm", async () => {
    vi.mocked(appointmentRepo.findAppointmentById).mockResolvedValue(
      makeAppointment({
        status: "PENDING",
        patient: { userId: "user-1", user: {} },
      })
    );

    await expect(
      updateAppointmentStatusService(
        makeSession("PATIENT", "user-1"),
        "appt-1",
        "CONFIRMED"
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("rescheduleAppointmentService", () => {
  it("rejects rescheduling a cancelled appointment", async () => {
    vi.mocked(appointmentRepo.findAppointmentById).mockResolvedValue(
      makeAppointment({ status: "CANCELLED" })
    );

    await expect(
      rescheduleAppointmentService(makeSession("ADMIN"), "appt-1", {
        scheduledAt: futureDate,
      })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("reschedules a pending appointment with no conflict", async () => {
    vi.mocked(appointmentRepo.findAppointmentById).mockResolvedValue(
      makeAppointment({ status: "PENDING" })
    );
    vi.mocked(
      appointmentRepo.findActiveAppointmentsForDoctorInRange
    ).mockResolvedValue([]);
    vi.mocked(appointmentRepo.rescheduleAppointment).mockResolvedValue(
      makeAppointment({ scheduledAt: futureDate })
    );

    const updated = await rescheduleAppointmentService(
      makeSession("ADMIN"),
      "appt-1",
      { scheduledAt: futureDate }
    );

    expect(updated.scheduledAt).toEqual(futureDate);
  });
});
