import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/core/cache/cache", () => ({
  getOrSetCache: vi.fn((_key: string, _ttl: number, fetcher: () => unknown) =>
    fetcher()
  ),
  invalidateCache: vi.fn(),
  CACHE_TTL: { healthCardLookup: 120 },
}));
vi.mock("@/core/security/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));
vi.mock("@/features/audit-logs/services/audit-log.service", () => ({
  writeAuditLog: vi.fn(),
}));
vi.mock("@/features/healthcard/repository/health-card.repository");
vi.mock("@/features/patients/repository/patient.repository");

import { invalidateCache } from "@/core/cache/cache";
import { writeAuditLog } from "@/features/audit-logs/services/audit-log.service";
import * as healthCardRepo from "@/features/healthcard/repository/health-card.repository";
import * as patientRepo from "@/features/patients/repository/patient.repository";
import {
  issueHealthCardService,
  reissueHealthCardService,
  updateHealthCardStatusService,
  verifyHealthCardByTokenService,
  verifyHealthCardPublicService,
} from "@/features/healthcard/services/health-card.service";
import { ConflictError, NotFoundError } from "@/core/api/errors";

function makeCard(overrides: Record<string, unknown> = {}) {
  return {
    id: "card-1",
    patientId: "patient-1",
    cardNumber: "HC-2026-ABCDEFGH",
    verificationToken: "token-123",
    status: "ACTIVE",
    issuedAt: new Date("2026-01-01"),
    expiresAt: new Date("2029-01-01"),
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    deletedAt: null,
    patient: {
      id: "patient-1",
      userId: "user-1",
      user: { id: "user-1", name: "John Smith", email: "john@example.com" },
    },
    ...overrides,
  } as unknown as NonNullable<
    Awaited<ReturnType<typeof healthCardRepo.findHealthCardById>>
  >;
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("issueHealthCardService", () => {
  it("creates a card when the patient exists and has none yet", async () => {
    vi.mocked(patientRepo.findPatientById).mockResolvedValue({
      id: "patient-1",
    } as never);
    vi.mocked(healthCardRepo.findHealthCardByPatientId).mockResolvedValue(null);
    vi.mocked(healthCardRepo.createHealthCard).mockResolvedValue(makeCard());

    const card = await issueHealthCardService("actor-1", {
      patientId: "patient-1",
    });

    expect(card.cardNumber).toBe("HC-2026-ABCDEFGH");
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CREATE", entityType: "HealthCard" })
    );
  });

  it("throws NotFoundError when the patient doesn't exist", async () => {
    vi.mocked(patientRepo.findPatientById).mockResolvedValue(null);

    await expect(
      issueHealthCardService("actor-1", { patientId: "missing" })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws ConflictError when the patient already has a card", async () => {
    vi.mocked(patientRepo.findPatientById).mockResolvedValue({
      id: "patient-1",
    } as never);
    vi.mocked(healthCardRepo.findHealthCardByPatientId).mockResolvedValue(
      makeCard()
    );

    await expect(
      issueHealthCardService("actor-1", { patientId: "patient-1" })
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("verifyHealthCardByTokenService", () => {
  it("throws NotFoundError when the token doesn't match a card", async () => {
    vi.mocked(healthCardRepo.findHealthCardByToken).mockResolvedValue(null);
    await expect(verifyHealthCardByTokenService("nope")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("throws ConflictError for a revoked card", async () => {
    vi.mocked(healthCardRepo.findHealthCardByToken).mockResolvedValue(
      makeCard({ status: "REVOKED" })
    );
    await expect(
      verifyHealthCardByTokenService("token-123")
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("throws ConflictError when expiresAt has passed even if status is still ACTIVE", async () => {
    vi.mocked(healthCardRepo.findHealthCardByToken).mockResolvedValue(
      makeCard({ status: "ACTIVE", expiresAt: new Date("2000-01-01") })
    );
    await expect(
      verifyHealthCardByTokenService("token-123")
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("returns the card when active and not expired", async () => {
    vi.mocked(healthCardRepo.findHealthCardByToken).mockResolvedValue(
      makeCard()
    );
    const card = await verifyHealthCardByTokenService("token-123");
    expect(card.status).toBe("ACTIVE");
  });
});

describe("verifyHealthCardPublicService", () => {
  it("returns a PII-redacted payload for a valid card", async () => {
    vi.mocked(healthCardRepo.findHealthCardByToken).mockResolvedValue(
      makeCard()
    );
    const result = await verifyHealthCardPublicService("token-123");

    expect(result).toEqual({
      valid: true,
      status: "ACTIVE",
      cardNumber: "HC-2026-ABCDEFGH",
      patientFirstName: "John",
      issuedAt: new Date("2026-01-01"),
      expiresAt: new Date("2029-01-01"),
    });
    expect(JSON.stringify(result)).not.toContain("john@example.com");
  });

  it("returns NOT_FOUND without throwing when the token is unknown", async () => {
    vi.mocked(healthCardRepo.findHealthCardByToken).mockResolvedValue(null);
    const result = await verifyHealthCardPublicService("nope");
    expect(result).toEqual({ valid: false, status: "NOT_FOUND" });
  });

  it("returns REVOKED with cardNumber but no patient info", async () => {
    vi.mocked(healthCardRepo.findHealthCardByToken).mockResolvedValue(
      makeCard({ status: "REVOKED" })
    );
    const result = await verifyHealthCardPublicService("token-123");
    expect(result).toMatchObject({ valid: false, status: "REVOKED" });
    expect(result).not.toHaveProperty("patientFirstName");
  });
});

describe("reissueHealthCardService", () => {
  it("rotates the token and invalidates the old cache entry", async () => {
    vi.mocked(healthCardRepo.findHealthCardById).mockResolvedValue(
      makeCard({ verificationToken: "old-token" })
    );
    vi.mocked(healthCardRepo.reissueHealthCard).mockResolvedValue(
      makeCard({ verificationToken: "new-token" })
    );

    const updated = await reissueHealthCardService("actor-1", "card-1", {
      newCardNumber: false,
    });

    expect(updated.verificationToken).toBe("new-token");
    expect(healthCardRepo.reissueHealthCard).toHaveBeenCalledWith("card-1", {
      newCardNumber: false,
      expiresAt: undefined,
    });
    expect(invalidateCache).toHaveBeenCalledWith(
      "cache:healthcard:token:old-token"
    );
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "REISSUE" })
    );
  });

  it("throws NotFoundError for an unknown card id", async () => {
    vi.mocked(healthCardRepo.findHealthCardById).mockResolvedValue(null);
    await expect(
      reissueHealthCardService("actor-1", "missing", { newCardNumber: false })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("updateHealthCardStatusService", () => {
  it("invalidates the token cache after a status change", async () => {
    vi.mocked(healthCardRepo.findHealthCardById).mockResolvedValue(
      makeCard({ verificationToken: "token-123" })
    );
    vi.mocked(healthCardRepo.updateHealthCardStatus).mockResolvedValue(
      makeCard({ status: "REVOKED" })
    );

    await updateHealthCardStatusService("actor-1", "card-1", "REVOKED");

    expect(invalidateCache).toHaveBeenCalledWith(
      "cache:healthcard:token:token-123"
    );
  });
});
