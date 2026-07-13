import "server-only";
import type { Session } from "@/core/auth/auth";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/core/api/errors";
import { paginationMeta, paginationSkipTake } from "@/core/api/pagination";
import { writeAuditLog } from "@/features/audit-logs/services/audit-log.service";
import * as healthCardRepo from "@/features/healthcard/repository/health-card.repository";
import * as patientRepo from "@/features/patients/repository/patient.repository";
import type {
  IssueHealthCardInput,
  ListHealthCardsQuery,
} from "@/features/healthcard/validation/health-card.validation";
import type { HealthCardStatus } from "@/generated/prisma/client";

type HealthCardRecord = NonNullable<
  Awaited<ReturnType<typeof healthCardRepo.findHealthCardById>>
>;

function assertReadAccess(session: Session, card: HealthCardRecord) {
  const role = session.user.role;
  if (role === "ADMIN" || role === "DOCTOR") return;
  if (role === "PATIENT" && card.patient.userId === session.user.id) return;
  throw new ForbiddenError();
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

export async function getOwnHealthCardService(session: Session) {
  const patient = await patientRepo.findPatientByUserId(session.user.id);
  if (!patient) throw new NotFoundError("Patient profile");

  const card = await healthCardRepo.findHealthCardByPatientId(patient.id);
  if (!card) throw new NotFoundError("Health card");
  return card;
}

export async function verifyHealthCardByTokenService(token: string) {
  const card = await healthCardRepo.findHealthCardByToken(token);
  if (!card) throw new NotFoundError("Health card");
  if (card.status !== "ACTIVE") {
    throw new ConflictError(`Health card is ${card.status.toLowerCase()}`);
  }
  return card;
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

  await writeAuditLog({
    actorId,
    action: "STATUS_CHANGE",
    entityType: "HealthCard",
    entityId: id,
    metadata: { status },
  });

  return updated;
}
