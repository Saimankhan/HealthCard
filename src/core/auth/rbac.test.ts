import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/core/auth/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

import { auth, type Session } from "@/core/auth/auth";
import {
  requireRole,
  requireSession,
  requireSuperAdmin,
} from "@/core/auth/rbac";
import { ForbiddenError, UnauthorizedError } from "@/core/api/errors";

const mockedGetSession = vi.mocked(auth.api.getSession);

function makeSession(role: string): Session {
  return {
    user: { id: "u1", role },
    session: { id: "s1" },
  } as unknown as Session;
}

describe("requireSession", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns the session when authenticated", async () => {
    mockedGetSession.mockResolvedValue(makeSession("PATIENT"));
    const session = await requireSession();
    expect(session.user.role).toBe("PATIENT");
  });

  it("throws UnauthorizedError when there is no session", async () => {
    mockedGetSession.mockResolvedValue(null);
    await expect(requireSession()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe("requireRole", () => {
  beforeEach(() => vi.resetAllMocks());

  it("allows a session whose role is in the allowed list", async () => {
    mockedGetSession.mockResolvedValue(makeSession("ADMIN"));
    const session = await requireRole("ADMIN", "SUPER_ADMIN");
    expect(session.user.role).toBe("ADMIN");
  });

  it("throws ForbiddenError when the role is not allowed", async () => {
    mockedGetSession.mockResolvedValue(makeSession("PATIENT"));
    await expect(requireRole("ADMIN")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("throws UnauthorizedError before checking role when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null);
    await expect(requireRole("ADMIN")).rejects.toBeInstanceOf(
      UnauthorizedError
    );
  });
});

describe("requireSuperAdmin", () => {
  beforeEach(() => vi.resetAllMocks());

  it("rejects a plain ADMIN", async () => {
    mockedGetSession.mockResolvedValue(makeSession("ADMIN"));
    await expect(requireSuperAdmin()).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("allows SUPER_ADMIN", async () => {
    mockedGetSession.mockResolvedValue(makeSession("SUPER_ADMIN"));
    await expect(requireSuperAdmin()).resolves.toBeDefined();
  });
});
