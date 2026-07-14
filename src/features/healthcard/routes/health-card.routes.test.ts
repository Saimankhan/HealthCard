import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/core/auth/rbac", () => ({
  requireRole: vi.fn(),
  requireSession: vi.fn(),
}));
vi.mock("@/core/security/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));
vi.mock("@/features/healthcard/services/health-card.service", () => ({
  verifyHealthCardByTokenService: vi.fn(),
  verifyHealthCardPublicService: vi.fn(),
  isPublicVerifyRateLimited: vi.fn(),
  getHealthCardByIdService: vi.fn(),
  getOwnHealthCardService: vi.fn(),
  issueHealthCardService: vi.fn(),
  listHealthCardsService: vi.fn(),
  reissueHealthCardService: vi.fn(),
  updateHealthCardStatusService: vi.fn(),
}));

import { withErrorHandling } from "@/core/api/handler";
import { requireRole } from "@/core/auth/rbac";
import { checkRateLimit } from "@/core/security/rate-limit";
import {
  isPublicVerifyRateLimited,
  verifyHealthCardByTokenService,
  verifyHealthCardPublicService,
} from "@/features/healthcard/services/health-card.service";
import {
  publicVerifyHealthCardHandler,
  verifyHealthCardHandler,
} from "@/features/healthcard/routes/health-card.routes";
import { ForbiddenError, NotFoundError } from "@/core/api/errors";

const GET_PUBLIC_VERIFY = withErrorHandling(publicVerifyHealthCardHandler);
const GET_STAFF_VERIFY = withErrorHandling(verifyHealthCardHandler);

function makeRequest(url: string) {
  return new NextRequest(url);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(checkRateLimit).mockResolvedValue(true);
});

describe("GET /api/health-cards/public-verify/[token]", () => {
  it("returns 409 when rate limited", async () => {
    vi.mocked(isPublicVerifyRateLimited).mockResolvedValue(true);

    const response = await GET_PUBLIC_VERIFY(
      makeRequest("http://localhost/api/health-cards/public-verify/tok"),
      { params: Promise.resolve({ token: "tok" }) }
    );

    expect(response.status).toBe(409);
  });

  it("returns 200 with a NOT_FOUND payload for an unknown token", async () => {
    vi.mocked(isPublicVerifyRateLimited).mockResolvedValue(false);
    vi.mocked(verifyHealthCardPublicService).mockResolvedValue({
      valid: false,
      status: "NOT_FOUND",
    });

    const response = await GET_PUBLIC_VERIFY(
      makeRequest("http://localhost/api/health-cards/public-verify/tok"),
      { params: Promise.resolve({ token: "tok" }) }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual({ valid: false, status: "NOT_FOUND" });
  });

  it("returns the redacted valid payload with no PII", async () => {
    vi.mocked(isPublicVerifyRateLimited).mockResolvedValue(false);
    vi.mocked(verifyHealthCardPublicService).mockResolvedValue({
      valid: true,
      status: "ACTIVE",
      cardNumber: "HC-2026-X",
      patientFirstName: "John",
      issuedAt: new Date("2026-01-01"),
      expiresAt: new Date("2029-01-01"),
    });

    const response = await GET_PUBLIC_VERIFY(
      makeRequest("http://localhost/api/health-cards/public-verify/tok"),
      { params: Promise.resolve({ token: "tok" }) }
    );

    const body = await response.json();
    expect(body.data.valid).toBe(true);
    expect(JSON.stringify(body)).not.toContain("email");
    expect(JSON.stringify(body)).not.toContain("phone");
  });
});

describe("GET /api/health-cards/verify/[token]", () => {
  it("returns 403 when the caller lacks the required role", async () => {
    vi.mocked(requireRole).mockRejectedValue(new ForbiddenError());

    const response = await GET_STAFF_VERIFY(
      makeRequest("http://localhost/api/health-cards/verify/tok"),
      { params: Promise.resolve({ token: "tok" }) }
    );

    expect(response.status).toBe(403);
  });

  it("returns 409 when the authenticated caller is rate limited", async () => {
    vi.mocked(requireRole).mockResolvedValue({
      user: { id: "admin-1", role: "ADMIN" },
    } as never);
    vi.mocked(checkRateLimit).mockResolvedValue(false);

    const response = await GET_STAFF_VERIFY(
      makeRequest("http://localhost/api/health-cards/verify/tok"),
      { params: Promise.resolve({ token: "tok" }) }
    );

    expect(response.status).toBe(409);
    expect(verifyHealthCardByTokenService).not.toHaveBeenCalled();
  });

  it("returns 404 when the token doesn't match a card", async () => {
    vi.mocked(requireRole).mockResolvedValue({
      user: { id: "admin-1", role: "ADMIN" },
    } as never);
    vi.mocked(verifyHealthCardByTokenService).mockRejectedValue(
      new NotFoundError("Health card")
    );

    const response = await GET_STAFF_VERIFY(
      makeRequest("http://localhost/api/health-cards/verify/tok"),
      { params: Promise.resolve({ token: "tok" }) }
    );

    expect(response.status).toBe(404);
  });

  it("returns the full record (including email) for staff", async () => {
    vi.mocked(requireRole).mockResolvedValue({
      user: { id: "admin-1", role: "ADMIN" },
    } as never);
    vi.mocked(verifyHealthCardByTokenService).mockResolvedValue({
      id: "card-1",
      cardNumber: "HC-2026-X",
      patient: { user: { email: "john@example.com" } },
    } as never);

    const response = await GET_STAFF_VERIFY(
      makeRequest("http://localhost/api/health-cards/verify/tok"),
      { params: Promise.resolve({ token: "tok" }) }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.patient.user.email).toBe("john@example.com");
  });
});
