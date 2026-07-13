import "server-only";
import type { Session } from "@/core/auth/auth";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/core/api/errors";
import { paginationMeta, paginationSkipTake } from "@/core/api/pagination";
import { writeAuditLog } from "@/features/audit-logs/services/audit-log.service";
import { createNotification } from "@/features/notifications/repository/notification.repository";
import * as appointmentRepo from "@/features/appointments/repository/appointment.repository";
import * as patientRepo from "@/features/patients/repository/patient.repository";
import * as doctorRepo from "@/features/doctors/repository/doctor.repository";
import type { AppointmentStatus } from "@/generated/prisma/client";
import type {
  CreateAppointmentInput,
  ListAppointmentsQuery,
  RescheduleAppointmentInput,
} from "@/features/appointments/validation/appointment.validation";

type AppointmentRecord = NonNullable<
  Awaited<ReturnType<typeof appointmentRepo.findAppointmentById>>
>;

const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

async function assertNoConflict(
  doctorId: string,
  scheduledAt: Date,
  durationMinutes: number,
  excludeId?: string
) {
  const rangeEnd = new Date(scheduledAt.getTime() + durationMinutes * 60_000);
  const candidates =
    await appointmentRepo.findActiveAppointmentsForDoctorInRange(
      doctorId,
      scheduledAt,
      rangeEnd,
      excludeId
    );

  const hasConflict = candidates.some((appt) => {
    const apptEnd = new Date(
      appt.scheduledAt.getTime() + appt.durationMinutes * 60_000
    );
    return (
      appt.scheduledAt.getTime() < rangeEnd.getTime() &&
      scheduledAt.getTime() < apptEnd.getTime()
    );
  });

  if (hasConflict) {
    throw new ConflictError("Doctor is not available at the requested time");
  }
}

function assertReadAccess(session: Session, appointment: AppointmentRecord) {
  const role = session.user.role;
  if (role === "ADMIN") return;
  if (role === "PATIENT" && appointment.patient.userId === session.user.id)
    return;
  if (role === "DOCTOR" && appointment.doctor.userId === session.user.id)
    return;
  throw new ForbiddenError();
}

export async function listAppointmentsService(
  session: Session,
  query: ListAppointmentsQuery
) {
  const { skip, take } = paginationSkipTake(query);

  let patientId = query.patientId;
  let doctorId = query.doctorId;

  if (session.user.role === "PATIENT") {
    const patient = await patientRepo.findPatientByUserId(session.user.id);
    if (!patient) throw new NotFoundError("Patient profile");
    patientId = patient.id;
  } else if (session.user.role === "DOCTOR") {
    const doctor = await doctorRepo.findDoctorByUserId(session.user.id);
    if (!doctor) throw new NotFoundError("Doctor profile");
    doctorId = doctor.id;
  }

  const { items, total } = await appointmentRepo.listAppointments({
    skip,
    take,
    sortOrder: query.sortOrder,
    status: query.status,
    patientId,
    doctorId,
    from: query.from,
    to: query.to,
  });

  return { items, meta: paginationMeta(query, total) };
}

export async function getAppointmentByIdService(session: Session, id: string) {
  const appointment = await appointmentRepo.findAppointmentById(id);
  if (!appointment) throw new NotFoundError("Appointment");
  assertReadAccess(session, appointment);
  return appointment;
}

export async function createAppointmentService(
  session: Session,
  input: CreateAppointmentInput
) {
  let patientId: string;

  if (session.user.role === "ADMIN" && input.patientId) {
    patientId = input.patientId;
  } else if (session.user.role === "PATIENT") {
    const patient = await patientRepo.findPatientByUserId(session.user.id);
    if (!patient) throw new NotFoundError("Patient profile");
    patientId = patient.id;
  } else {
    throw new ForbiddenError();
  }

  const doctor = await doctorRepo.findDoctorById(input.doctorId);
  if (!doctor) throw new NotFoundError("Doctor");

  if (input.scheduledAt.getTime() <= Date.now()) {
    throw new BadRequestError("Appointment must be scheduled in the future");
  }

  await assertNoConflict(
    input.doctorId,
    input.scheduledAt,
    input.durationMinutes
  );

  const appointment = await appointmentRepo.createAppointment({
    patient: { connect: { id: patientId } },
    doctor: { connect: { id: input.doctorId } },
    scheduledAt: input.scheduledAt,
    durationMinutes: input.durationMinutes,
    reason: input.reason,
  });

  await createNotification({
    userId: appointment.patient.userId,
    type: "APPOINTMENT_CONFIRMATION",
    title: "Appointment requested",
    message: `Your appointment request for ${appointment.scheduledAt.toDateString()} has been submitted.`,
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: "CREATE",
    entityType: "Appointment",
    entityId: appointment.id,
  });

  return appointment;
}

export async function updateAppointmentStatusService(
  session: Session,
  id: string,
  status: AppointmentStatus
) {
  const appointment = await appointmentRepo.findAppointmentById(id);
  if (!appointment) throw new NotFoundError("Appointment");

  const allowed = ALLOWED_TRANSITIONS[appointment.status] ?? [];
  if (!allowed.includes(status)) {
    throw new ConflictError(
      `Cannot transition appointment from ${appointment.status} to ${status}`
    );
  }

  const role = session.user.role;
  if (role === "PATIENT") {
    if (appointment.patient.userId !== session.user.id)
      throw new ForbiddenError();
    if (status !== "CANCELLED") {
      throw new ForbiddenError("Patients may only cancel appointments");
    }
  } else if (role === "DOCTOR") {
    if (appointment.doctor.userId !== session.user.id)
      throw new ForbiddenError();
  } else if (role !== "ADMIN") {
    throw new ForbiddenError();
  }

  const updated = await appointmentRepo.updateAppointmentStatus(id, status);

  const notificationCopy: Partial<
    Record<
      AppointmentStatus,
      {
        title: string;
        message: string;
        type: "APPOINTMENT_CONFIRMATION" | "APPOINTMENT_CANCELLED";
      }
    >
  > = {
    CONFIRMED: {
      title: "Appointment confirmed",
      message: `Your appointment on ${updated.scheduledAt.toDateString()} has been confirmed.`,
      type: "APPOINTMENT_CONFIRMATION",
    },
    CANCELLED: {
      title: "Appointment cancelled",
      message: `Your appointment on ${updated.scheduledAt.toDateString()} has been cancelled.`,
      type: "APPOINTMENT_CANCELLED",
    },
  };
  const copy = notificationCopy[status];
  if (copy) {
    await createNotification({
      userId: updated.patient.userId,
      type: copy.type,
      title: copy.title,
      message: copy.message,
    });
  }

  await writeAuditLog({
    actorId: session.user.id,
    action: "STATUS_CHANGE",
    entityType: "Appointment",
    entityId: id,
    metadata: { from: appointment.status, to: status },
  });

  return updated;
}

export async function rescheduleAppointmentService(
  session: Session,
  id: string,
  input: RescheduleAppointmentInput
) {
  const appointment = await appointmentRepo.findAppointmentById(id);
  if (!appointment) throw new NotFoundError("Appointment");

  if (!["PENDING", "CONFIRMED"].includes(appointment.status)) {
    throw new ConflictError(
      "Only pending or confirmed appointments can be rescheduled"
    );
  }

  const role = session.user.role;
  if (role === "PATIENT" && appointment.patient.userId !== session.user.id) {
    throw new ForbiddenError();
  } else if (
    role === "DOCTOR" &&
    appointment.doctor.userId !== session.user.id
  ) {
    throw new ForbiddenError();
  } else if (role !== "ADMIN" && role !== "PATIENT" && role !== "DOCTOR") {
    throw new ForbiddenError();
  }

  if (input.scheduledAt.getTime() <= Date.now()) {
    throw new BadRequestError("Appointment must be scheduled in the future");
  }

  await assertNoConflict(
    appointment.doctorId,
    input.scheduledAt,
    appointment.durationMinutes,
    id
  );

  const updated = await appointmentRepo.rescheduleAppointment(
    id,
    input.scheduledAt
  );

  await createNotification({
    userId: updated.patient.userId,
    type: "APPOINTMENT_CONFIRMATION",
    title: "Appointment rescheduled",
    message: `Your appointment has been rescheduled to ${updated.scheduledAt.toDateString()}.`,
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "Appointment",
    entityId: id,
    metadata: { scheduledAt: input.scheduledAt },
  });

  return updated;
}
