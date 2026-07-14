import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/core/cache/cache", () => ({
  getOrSetCache: vi.fn((_key: string, _ttl: number, fetcher: () => unknown) =>
    fetcher()
  ),
  invalidateCache: vi.fn(),
  CACHE_TTL: { doctorList: 300 },
}));
vi.mock("@/features/audit-logs/services/audit-log.service", () => ({
  writeAuditLog: vi.fn(),
}));
vi.mock("@/features/doctors/repository/doctor.repository");
vi.mock("@/features/users/repository/user.repository");
vi.mock("@/features/patients/repository/patient.repository");

import * as doctorRepo from "@/features/doctors/repository/doctor.repository";
import * as userRepo from "@/features/users/repository/user.repository";
import * as patientRepo from "@/features/patients/repository/patient.repository";
import { createDoctorService } from "@/features/doctors/services/doctor.service";
import { ConflictError, NotFoundError } from "@/core/api/errors";

function makeInput(overrides: Record<string, unknown> = {}) {
  return {
    userId: "user-1",
    licenseNumber: "LIC-1",
    specializationIds: [],
    ...overrides,
  } as never;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(doctorRepo.createDoctor).mockResolvedValue({
    id: "doctor-1",
  } as never);
  vi.mocked(doctorRepo.findDoctorByUserId).mockResolvedValue(null);
  vi.mocked(patientRepo.findPatientByUserId).mockResolvedValue(null);
});

describe("createDoctorService", () => {
  it("throws NotFoundError when the user doesn't exist", async () => {
    vi.mocked(userRepo.findUserById).mockResolvedValue(null);
    await expect(
      createDoctorService("actor-1", makeInput())
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws ConflictError when a doctor profile already exists for the user", async () => {
    vi.mocked(userRepo.findUserById).mockResolvedValue({
      id: "user-1",
      role: "PATIENT",
    } as never);
    vi.mocked(doctorRepo.findDoctorByUserId).mockResolvedValue({
      id: "existing-doctor",
    } as never);

    await expect(
      createDoctorService("actor-1", makeInput())
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("promotes a PATIENT user's role to DOCTOR", async () => {
    vi.mocked(userRepo.findUserById).mockResolvedValue({
      id: "user-1",
      role: "PATIENT",
    } as never);

    await createDoctorService("actor-1", makeInput());

    expect(userRepo.updateUser).toHaveBeenCalledWith("user-1", {
      role: "DOCTOR",
    });
  });

  it("does not touch the role if the user is already an admin", async () => {
    vi.mocked(userRepo.findUserById).mockResolvedValue({
      id: "user-1",
      role: "ADMIN",
    } as never);

    await createDoctorService("actor-1", makeInput());

    expect(userRepo.updateUser).not.toHaveBeenCalled();
  });

  it("soft-deletes an existing patient profile for the same user", async () => {
    vi.mocked(userRepo.findUserById).mockResolvedValue({
      id: "user-1",
      role: "PATIENT",
    } as never);
    vi.mocked(patientRepo.findPatientByUserId).mockResolvedValue({
      id: "patient-1",
    } as never);

    await createDoctorService("actor-1", makeInput());

    expect(patientRepo.softDeletePatient).toHaveBeenCalledWith("patient-1");
  });

  it("does not attempt to soft-delete when the user has no patient profile", async () => {
    vi.mocked(userRepo.findUserById).mockResolvedValue({
      id: "user-1",
      role: "PATIENT",
    } as never);

    await createDoctorService("actor-1", makeInput());

    expect(patientRepo.softDeletePatient).not.toHaveBeenCalled();
  });
});
