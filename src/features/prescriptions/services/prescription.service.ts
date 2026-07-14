import "server-only";
import type { Session } from "@/core/auth/auth";
import { isAdminRole } from "@/core/auth/roles";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/core/api/errors";
import { paginationMeta, paginationSkipTake } from "@/core/api/pagination";
import { writeAuditLog } from "@/features/audit-logs/services/audit-log.service";
import { createNotification } from "@/features/notifications/repository/notification.repository";
import * as prescriptionRepo from "@/features/prescriptions/repository/prescription.repository";
import * as patientRepo from "@/features/patients/repository/patient.repository";
import * as doctorRepo from "@/features/doctors/repository/doctor.repository";
import {
  findAppointmentById,
  existsAppointmentForDoctorAndPatient,
} from "@/features/appointments/repository/appointment.repository";
import type {
  CreatePrescriptionInput,
  ListPrescriptionsQuery,
  UpdatePrescriptionInput,
} from "@/features/prescriptions/validation/prescription.validation";

type PrescriptionRecord = NonNullable<
  Awaited<ReturnType<typeof prescriptionRepo.findPrescriptionById>>
>;

function assertReadAccess(session: Session, prescription: PrescriptionRecord) {
  const role = session.user.role;
  if (isAdminRole(role)) return;
  if (role === "PATIENT" && prescription.patient.userId === session.user.id)
    return;
  if (role === "DOCTOR" && prescription.doctor.userId === session.user.id)
    return;
  throw new ForbiddenError();
}

function assertWriteAccess(session: Session, prescription: PrescriptionRecord) {
  const role = session.user.role;
  if (isAdminRole(role)) return;
  if (role === "DOCTOR" && prescription.doctor.userId === session.user.id)
    return;
  throw new ForbiddenError();
}

export async function listPrescriptionsService(
  session: Session,
  query: ListPrescriptionsQuery
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

  const { items, total } = await prescriptionRepo.listPrescriptions({
    skip,
    take,
    sortOrder: query.sortOrder,
    patientId,
    doctorId,
  });

  return { items, meta: paginationMeta(query, total) };
}

export async function getPrescriptionByIdService(session: Session, id: string) {
  const prescription = await prescriptionRepo.findPrescriptionById(id);
  if (!prescription) throw new NotFoundError("Prescription");
  assertReadAccess(session, prescription);
  return prescription;
}

export async function createPrescriptionService(
  session: Session,
  input: CreatePrescriptionInput
) {
  if (session.user.role !== "DOCTOR") throw new ForbiddenError();

  const doctor = await doctorRepo.findDoctorByUserId(session.user.id);
  if (!doctor) throw new NotFoundError("Doctor profile");

  const patient = await patientRepo.findPatientById(input.patientId);
  if (!patient) throw new NotFoundError("Patient");

  const assigned = await existsAppointmentForDoctorAndPatient(
    doctor.id,
    input.patientId
  );
  if (!assigned) throw new ForbiddenError();

  if (input.appointmentId) {
    const appointment = await findAppointmentById(input.appointmentId);
    if (!appointment) throw new NotFoundError("Appointment");
    if (
      appointment.doctorId !== doctor.id ||
      appointment.patientId !== input.patientId
    ) {
      throw new BadRequestError(
        "Appointment does not match the given doctor and patient"
      );
    }
  }

  const prescription = await prescriptionRepo.createPrescription({
    patient: { connect: { id: input.patientId } },
    doctor: { connect: { id: doctor.id } },
    ...(input.appointmentId
      ? { appointment: { connect: { id: input.appointmentId } } }
      : {}),
    medications: input.medications,
    notes: input.notes,
  });

  await createNotification({
    userId: patient.userId,
    type: "PRESCRIPTION_READY",
    title: "New prescription available",
    message: "Your doctor has issued a new prescription.",
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: "CREATE",
    entityType: "Prescription",
    entityId: prescription.id,
  });

  return prescription;
}

export async function updatePrescriptionService(
  session: Session,
  id: string,
  input: UpdatePrescriptionInput
) {
  const prescription = await prescriptionRepo.findPrescriptionById(id);
  if (!prescription) throw new NotFoundError("Prescription");
  assertWriteAccess(session, prescription);

  const updated = await prescriptionRepo.updatePrescription(id, {
    medications: input.medications,
    notes: input.notes,
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "Prescription",
    entityId: id,
  });

  return updated;
}

export async function deletePrescriptionService(session: Session, id: string) {
  const prescription = await prescriptionRepo.findPrescriptionById(id);
  if (!prescription) throw new NotFoundError("Prescription");
  assertWriteAccess(session, prescription);

  const deleted = await prescriptionRepo.softDeletePrescription(id);

  await writeAuditLog({
    actorId: session.user.id,
    action: "DELETE",
    entityType: "Prescription",
    entityId: id,
  });

  return deleted;
}
