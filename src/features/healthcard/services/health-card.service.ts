import "server-only";
import type { Session } from "@/core/auth/auth";
import { isAdminRole } from "@/core/auth/roles";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/core/api/errors";
import { paginationMeta, paginationSkipTake } from "@/core/api/pagination";
import { CACHE_TTL, getOrSetCache, invalidateCache } from "@/core/cache/cache";
import { checkRateLimit } from "@/core/security/rate-limit";
import { writeAuditLog } from "@/features/audit-logs/services/audit-log.service";
import * as healthCardRepo from "@/features/healthcard/repository/health-card.repository";
import * as patientRepo from "@/features/patients/repository/patient.repository";
import type {
  IssueHealthCardInput,
  ListHealthCardsQuery,
  ReissueHealthCardInput,
} from "@/features/healthcard/validation/health-card.validation";
import type { HealthCardStatus } from "@/generated/prisma/client";

type HealthCardRecord = NonNullable<
  Awaited<ReturnType<typeof healthCardRepo.findHealthCardById>>
>;

export type PublicHealthCardVerification =
  | {
      valid: true;
      status: "ACTIVE";
      cardNumber: string;
      patientFirstName: string;
      issuedAt: Date;
      expiresAt: Date | null;
    }
  | { valid: false; status: "NOT_FOUND" }
  | {
      valid: false;
      status: "EXPIRED" | "REVOKED";
      cardNumber: string;
      expiresAt: Date | null;
    };

function assertReadAccess(session: Session, card: HealthCardRecord) {
  const role = session.user.role;
  if (isAdminRole(role) || role === "DOCTOR") return;
  if (role === "PATIENT" && card.patient.userId === session.user.id) return;
  throw new ForbiddenError();
}

/**
 * `expiresAt` passing doesn't flip the persisted `status` column (no cron
 * currently does that), so expiry is resolved dynamically here rather than
 * trusted from the stored value alone. REVOKED always wins.
 */
function resolveHealthCardState(
  card: Pick<HealthCardRecord, "status" | "expiresAt">
): HealthCardStatus {
  if (card.status === "REVOKED") return "REVOKED";
  if (
    card.status === "EXPIRED" ||
    (card.expiresAt !== null && card.expiresAt < new Date())
  ) {
    return "EXPIRED";
  }
  return "ACTIVE";
}

function healthCardTokenCacheKey(token: string) {
  return `cache:healthcard:token:${token}`;
}

async function getCachedHealthCardByToken(token: string) {
  return getOrSetCache(
    healthCardTokenCacheKey(token),
    CACHE_TTL.healthCardLookup,
    () => healthCardRepo.findHealthCardByToken(token)
  );
}

const PUBLIC_VERIFY_TOKEN_LIMIT = { limit: 20, windowSeconds: 3600 };
const PUBLIC_VERIFY_IP_LIMIT = { limit: 60, windowSeconds: 3600 };

/**
 * Shared by both the public-verify API route and the `/verify/[token]` page
 * (which calls the service directly, server-side) so the rate-limit keys
 * live in one place regardless of entry point.
 */
export async function isPublicVerifyRateLimited(
  token: string,
  clientIp: string
): Promise<boolean> {
  const [tokenAllowed, ipAllowed] = await Promise.all([
    checkRateLimit(
      `public-verify:token:${token}`,
      PUBLIC_VERIFY_TOKEN_LIMIT.limit,
      PUBLIC_VERIFY_TOKEN_LIMIT.windowSeconds
    ),
    checkRateLimit(
      `public-verify:ip:${clientIp}`,
      PUBLIC_VERIFY_IP_LIMIT.limit,
      PUBLIC_VERIFY_IP_LIMIT.windowSeconds
    ),
  ]);
  return !tokenAllowed || !ipAllowed;
}

export async function listHealthCardsService(query: ListHealthCardsQuery) {
  const { skip, take } = paginationSkipTake(query);
  const { items, total } = await healthCardRepo.listHealthCards({
    skip,
    take,
    sortOrder: query.sortOrder,
    status: query.status,
  });
  return { items, meta: paginationMeta(query, total) };
}

export async function getHealthCardByIdService(session: Session, id: string) {
  const card = await healthCardRepo.findHealthCardById(id);
  if (!card) throw new NotFoundError("Health card");
  assertReadAccess(session, card);
  return card;
}

export async function getHealthCardByPatientIdService(
  session: Session,
  patientId: string
) {
  const card = await healthCardRepo.findHealthCardByPatientId(patientId);
  if (!card) return null;
  assertReadAccess(session, card);
  return card;
}

export async function getOwnHealthCardService(session: Session) {
  const patient = await patientRepo.findPatientByUserId(session.user.id);
  if (!patient) throw new NotFoundError("Patient profile");

  const card = await healthCardRepo.findHealthCardByPatientId(patient.id);
  if (!card) throw new NotFoundError("Health card");
  return card;
}

export async function verifyHealthCardByTokenService(token: string) {
  const card = await getCachedHealthCardByToken(token);
  if (!card) throw new NotFoundError("Health card");

  const state = resolveHealthCardState(card);
  if (state !== "ACTIVE") {
    throw new ConflictError(`Health card is ${state.toLowerCase()}`);
  }
  return card;
}

/**
 * Unauthenticated counterpart used by the public QR-scan verify page.
 * Returns a PII-redacted shape (no email/phone) with an explicit status
 * discriminant instead of throwing, so the caller can render distinct
 * not-found/expired/revoked/active states.
 */
export async function verifyHealthCardPublicService(
  token: string
): Promise<PublicHealthCardVerification> {
  const card = await getCachedHealthCardByToken(token);
  if (!card) {
    return { valid: false, status: "NOT_FOUND" };
  }

  const state = resolveHealthCardState(card);
  if (state !== "ACTIVE") {
    return {
      valid: false,
      status: state,
      cardNumber: card.cardNumber,
      expiresAt: card.expiresAt,
    };
  }

  return {
    valid: true,
    status: "ACTIVE",
    cardNumber: card.cardNumber,
    patientFirstName: card.patient.user.name?.split(" ")[0] || "Patient",
    issuedAt: card.issuedAt,
    expiresAt: card.expiresAt,
  };
}

export async function issueHealthCardService(
  actorId: string,
  input: IssueHealthCardInput
) {
  const patient = await patientRepo.findPatientById(input.patientId);
  if (!patient) throw new NotFoundError("Patient");

  const existing = await healthCardRepo.findHealthCardByPatientId(
    input.patientId
  );
  if (existing) {
    throw new ConflictError("A health card already exists for this patient");
  }

  const card = await healthCardRepo.createHealthCard(
    input.patientId,
    input.expiresAt
  );

  await writeAuditLog({
    actorId,
    action: "CREATE",
    entityType: "HealthCard",
    entityId: card.id,
  });

  return card;
}

export async function updateHealthCardStatusService(
  actorId: string,
  id: string,
  status: HealthCardStatus
) {
  const existing = await healthCardRepo.findHealthCardById(id);
  if (!existing) throw new NotFoundError("Health card");

  const updated = await healthCardRepo.updateHealthCardStatus(id, status);
  await invalidateCache(healthCardTokenCacheKey(existing.verificationToken));

  await writeAuditLog({
    actorId,
    action: "STATUS_CHANGE",
    entityType: "HealthCard",
    entityId: id,
    metadata: { status },
  });

  return updated;
}

export async function reissueHealthCardService(
  actorId: string,
  id: string,
  input: ReissueHealthCardInput
) {
  const existing = await healthCardRepo.findHealthCardById(id);
  if (!existing) throw new NotFoundError("Health card");

  const updated = await healthCardRepo.reissueHealthCard(id, {
    newCardNumber: input.newCardNumber,
    expiresAt: input.expiresAt,
  });
  await invalidateCache(healthCardTokenCacheKey(existing.verificationToken));

  await writeAuditLog({
    actorId,
    action: "REISSUE",
    entityType: "HealthCard",
    entityId: id,
    metadata: { newCardNumber: input.newCardNumber },
  });

  return updated;
}
