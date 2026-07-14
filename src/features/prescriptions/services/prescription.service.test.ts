import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/core/email/templates", () => ({
  prescriptionReadyEmail: vi.fn(() => ({ subject: "", html: "" })),
}));
vi.mock("@/features/audit-logs/services/audit-log.service", () => ({
  writeAuditLog: vi.fn(),
}));
vi.mock("@/features/notifications/services/notification.service", () => ({
  notifyUser: vi.fn(),
}));
vi.mock("@/features/prescriptions/repository/prescription.repository");
vi.mock("@/features/patients/repository/patient.repository");
vi.mock("@/features/doctors/repository/doctor.repository");
vi.mock("@/features/appointments/repository/appointment.repository", () => ({
  findAppointmentById: vi.fn(),
  existsAppointmentForDoctorAndPatient: vi.fn(),
}));

import * as prescriptionRepo from "@/features/prescriptions/repository/prescription.repository";
import * as patientRepo from "@/features/patients/repository/patient.repository";
import * as doctorRepo from "@/features/doctors/repository/doctor.repository";
import {
  existsAppointmentForDoctorAndPatient,
  findAppointmentById,
} from "@/features/appointments/repository/appointment.repository";
import { createPrescriptionService } from "@/features/prescriptions/services/prescription.service";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/core/api/errors";
import type { Session } from "@/core/auth/auth";
import type { CreatePrescriptionInput } from "@/features/prescriptions/validation/prescription.validation";

function makeSession(role: string, userId = "doctor-user-1"): Session {
  return { user: { id: userId, role } } as unknown as Session;
}

function makeInput(
  overrides: Partial<CreatePrescriptionInput> = {}
): CreatePrescriptionInput {
  return {
    patientId: "patient-1",
    medications: [{ name: "Ibuprofen", dosage: "200mg", frequency: "Daily" }],
    ...overrides,
  } as CreatePrescriptionInput;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(doctorRepo.findDoctorByUserId).mockResolvedValue({
    id: "doctor-1",
    user: { name: "Dr. Test", email: "doc@example.com" },
  } as never);
  vi.mocked(patientRepo.findPatientById).mockResolvedValue({
    id: "patient-1",
    userId: "patient-user-1",
    user: { name: "Pat", email: "p@example.com" },
  } as never);
  vi.mocked(existsAppointmentForDoctorAndPatient).mockResolvedValue(true);
  vi.mocked(prescriptionRepo.createPrescription).mockResolvedValue({
    id: "rx-1",
  } as never);
});

describe("createPrescriptionService", () => {
  it("rejects non-doctor callers", async () => {
    await expect(
      createPrescriptionService(makeSession("PATIENT"), makeInput())
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects when the doctor has never had an appointment with the patient", async () => {
    vi.mocked(existsAppointmentForDoctorAndPatient).mockResolvedValue(false);

    await expect(
      createPrescriptionService(makeSession("DOCTOR"), makeInput())
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects an appointmentId that belongs to a different doctor/patient pair", async () => {
    vi.mocked(findAppointmentById).mockResolvedValue({
      id: "appt-1",
      doctorId: "some-other-doctor",
      patientId: "patient-1",
    } as never);

    await expect(
      createPrescriptionService(
        makeSession("DOCTOR"),
        makeInput({ appointmentId: "appt-1" })
      )
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("rejects when the referenced appointmentId doesn't exist", async () => {
    vi.mocked(findAppointmentById).mockResolvedValue(null);

    await expect(
      createPrescriptionService(
        makeSession("DOCTOR"),
        makeInput({ appointmentId: "missing-appt" })
      )
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("succeeds when the appointment matches the doctor and patient", async () => {
    vi.mocked(findAppointmentById).mockResolvedValue({
      id: "appt-1",
      doctorId: "doctor-1",
      patientId: "patient-1",
    } as never);

    const prescription = await createPrescriptionService(
      makeSession("DOCTOR"),
      makeInput({ appointmentId: "appt-1" })
    );

    expect(prescription.id).toBe("rx-1");
  });

  it("succeeds with no appointmentId as long as the doctor has treated the patient", async () => {
    const prescription = await createPrescriptionService(
      makeSession("DOCTOR"),
      makeInput()
    );
    expect(prescription.id).toBe("rx-1");
  });
});
