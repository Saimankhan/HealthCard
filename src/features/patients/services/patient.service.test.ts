import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/core/cache/cache", () => ({
  getOrSetCache: vi.fn((_key: string, _ttl: number, fetcher: () => unknown) =>
    fetcher()
  ),
  invalidateCache: vi.fn(),
  CACHE_TTL: { patientList: 60 },
}));
vi.mock("@/features/audit-logs/services/audit-log.service", () => ({
  writeAuditLog: vi.fn(),
}));
vi.mock("@/features/healthcard/repository/health-card.repository", () => ({
  createHealthCard: vi.fn(),
}));
vi.mock("@/features/patients/repository/patient.repository");
vi.mock("@/features/doctors/repository/doctor.repository");

import { getOrSetCache } from "@/core/cache/cache";
import * as patientRepo from "@/features/patients/repository/patient.repository";
import * as doctorRepo from "@/features/doctors/repository/doctor.repository";
import { listPatientsService } from "@/features/patients/services/patient.service";
import type { Session } from "@/core/auth/auth";
import type { ListPatientsQuery } from "@/features/patients/validation/patient.validation";

function makeSession(role: string, userId = "user-1"): Session {
  return { user: { id: userId, role } } as unknown as Session;
}

function makeQuery(
  overrides: Partial<ListPatientsQuery> = {}
): ListPatientsQuery {
  return {
    page: 1,
    pageSize: 100,
    sortOrder: "asc",
    ...overrides,
  } as ListPatientsQuery;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(patientRepo.listPatients).mockResolvedValue({
    items: [],
    total: 0,
  } as never);
});

describe("listPatientsService — doctor scoping", () => {
  it("overrides a DOCTOR caller's doctorId with their own, even if they pass someone else's", async () => {
    vi.mocked(doctorRepo.findDoctorByUserId).mockResolvedValue({
      id: "doctor-self",
    } as never);

    await listPatientsService(
      makeSession("DOCTOR", "doctor-user-1"),
      makeQuery({ doctorId: "someone-elses-doctor-id" })
    );

    expect(patientRepo.listPatients).toHaveBeenCalledWith(
      expect.objectContaining({ doctorId: "doctor-self" })
    );
  });

  it("lets an ADMIN caller filter by any doctorId", async () => {
    await listPatientsService(
      makeSession("ADMIN"),
      makeQuery({ doctorId: "any-doctor-id" })
    );

    expect(patientRepo.listPatients).toHaveBeenCalledWith(
      expect.objectContaining({ doctorId: "any-doctor-id" })
    );
  });
});

describe("listPatientsService — default-query cache gating", () => {
  it("uses the cache for the canonical unfiltered admin query", async () => {
    await listPatientsService(makeSession("ADMIN"), makeQuery());
    expect(getOrSetCache).toHaveBeenCalledWith(
      "cache:patients:list:default",
      expect.any(Number),
      expect.any(Function)
    );
  });

  it("bypasses the cache when a search filter is present", async () => {
    await listPatientsService(
      makeSession("ADMIN"),
      makeQuery({ search: "john" })
    );
    expect(getOrSetCache).not.toHaveBeenCalled();
    expect(patientRepo.listPatients).toHaveBeenCalledWith(
      expect.objectContaining({ search: "john" })
    );
  });

  it("bypasses the cache for a DOCTOR caller even with default pagination (doctorId is always set)", async () => {
    vi.mocked(doctorRepo.findDoctorByUserId).mockResolvedValue({
      id: "doctor-self",
    } as never);

    await listPatientsService(
      makeSession("DOCTOR", "doctor-user-1"),
      makeQuery()
    );

    expect(getOrSetCache).not.toHaveBeenCalled();
  });
});
