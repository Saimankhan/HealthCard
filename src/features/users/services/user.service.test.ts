import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/core/storage/avatar", () => ({
  resolveAvatarUrl: vi.fn(async (image: string | null) => image),
}));
vi.mock("@/core/storage/storage", () => ({
  STORAGE_PREFIX: { profilePhotos: "profile-photos" },
  assertValidFileUpload: vi.fn(),
  deleteObject: vi.fn(),
  getSignedUploadUrl: vi.fn(),
}));
vi.mock("@/features/audit-logs/services/audit-log.service", () => ({
  writeAuditLog: vi.fn(),
}));
vi.mock("@/features/users/repository/user.repository");
vi.mock("@/features/patients/repository/patient.repository");
vi.mock("@/features/healthcard/repository/health-card.repository", () => ({
  createHealthCard: vi.fn(),
}));

import * as userRepo from "@/features/users/repository/user.repository";
import {
  updateUserRoleService,
  updateUserStatusService,
} from "@/features/users/services/user.service";
import { BadRequestError, ForbiddenError } from "@/core/api/errors";
import type { Session } from "@/core/auth/auth";

function makeSession(role: string, userId = "actor-1"): Session {
  return { user: { id: userId, role } } as unknown as Session;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(userRepo.findUserById).mockResolvedValue({
    id: "target-1",
    image: null,
  } as never);
  vi.mocked(userRepo.updateUser).mockResolvedValue({
    id: "target-1",
    image: null,
  } as never);
});

describe("updateUserRoleService", () => {
  it("blocks a plain admin from granting the ADMIN role", async () => {
    await expect(
      updateUserRoleService(makeSession("ADMIN"), "target-1", {
        role: "ADMIN",
      } as never)
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("blocks a plain admin from granting SUPER_ADMIN", async () => {
    await expect(
      updateUserRoleService(makeSession("ADMIN"), "target-1", {
        role: "SUPER_ADMIN",
      } as never)
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("allows a super admin to grant ADMIN", async () => {
    const updated = await updateUserRoleService(
      makeSession("SUPER_ADMIN"),
      "target-1",
      { role: "ADMIN" } as never
    );
    expect(updated.id).toBe("target-1");
  });

  it("allows a plain admin to grant a non-privileged role (e.g. DOCTOR)", async () => {
    const updated = await updateUserRoleService(
      makeSession("ADMIN"),
      "target-1",
      {
        role: "DOCTOR",
      } as never
    );
    expect(updated.id).toBe("target-1");
  });
});

describe("updateUserStatusService", () => {
  it("blocks a caller from changing their own status", async () => {
    await expect(
      updateUserStatusService(makeSession("ADMIN", "target-1"), "target-1", {
        action: "SUSPEND",
      } as never)
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("allows an admin to suspend someone else", async () => {
    vi.mocked(userRepo.suspendUser).mockResolvedValue({
      id: "target-1",
      image: null,
    } as never);

    const updated = await updateUserStatusService(
      makeSession("ADMIN", "actor-1"),
      "target-1",
      { action: "SUSPEND" } as never
    );
    expect(updated.id).toBe("target-1");
    expect(userRepo.suspendUser).toHaveBeenCalledWith("target-1");
  });
});
