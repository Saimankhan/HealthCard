import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/audit-logs/services/audit-log.service", () => ({
  writeAuditLog: vi.fn(),
}));
vi.mock("@/features/admin/repository/admin.repository");
vi.mock("@/features/users/repository/user.repository");
vi.mock("@/features/patients/repository/patient.repository");

import * as adminRepo from "@/features/admin/repository/admin.repository";
import { deleteAdminService } from "@/features/admin/services/admin.service";
import { BadRequestError, NotFoundError } from "@/core/api/errors";
import type { Session } from "@/core/auth/auth";

function makeSession(userId: string): Session {
  return { user: { id: userId, role: "SUPER_ADMIN" } } as unknown as Session;
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("deleteAdminService", () => {
  it("throws NotFoundError for an unknown admin id", async () => {
    vi.mocked(adminRepo.findAdminById).mockResolvedValue(null);
    await expect(
      deleteAdminService(makeSession("actor-1"), "missing")
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("blocks an admin from deactivating their own account", async () => {
    vi.mocked(adminRepo.findAdminById).mockResolvedValue({
      id: "admin-1",
      userId: "actor-1",
    } as never);

    await expect(
      deleteAdminService(makeSession("actor-1"), "admin-1")
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("blocks removing the last remaining admin", async () => {
    vi.mocked(adminRepo.findAdminById).mockResolvedValue({
      id: "admin-2",
      userId: "some-other-user",
    } as never);
    vi.mocked(adminRepo.countActiveAdmins).mockResolvedValue(1);

    await expect(
      deleteAdminService(makeSession("actor-1"), "admin-2")
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("succeeds when deactivating someone else while other admins remain", async () => {
    vi.mocked(adminRepo.findAdminById).mockResolvedValue({
      id: "admin-2",
      userId: "some-other-user",
    } as never);
    vi.mocked(adminRepo.countActiveAdmins).mockResolvedValue(2);
    vi.mocked(adminRepo.softDeleteAdmin).mockResolvedValue({
      id: "admin-2",
    } as never);

    const result = await deleteAdminService(makeSession("actor-1"), "admin-2");
    expect(result.id).toBe("admin-2");
  });
});
