import { NextResponse, type NextRequest } from "next/server";
import QRCode from "qrcode";

import { requireRole, requireSession } from "@/core/auth/rbac";
import { ADMIN_ROLES } from "@/core/auth/roles";
import { ConflictError } from "@/core/api/errors";
import { successResponse } from "@/core/api/response";
import { parseSearchParams } from "@/core/api/pagination";
import { idParamSchema } from "@/core/api/schemas";
import { checkRateLimit, getClientIp } from "@/core/security/rate-limit";
import { clientEnv } from "@/core/config/env.client";
import {
  issueHealthCardSchema,
  listHealthCardsQuerySchema,
  reissueHealthCardSchema,
  updateHealthCardStatusSchema,
} from "@/features/healthcard/validation/health-card.validation";
import {
  getHealthCardByIdService,
  getOwnHealthCardService,
  isPublicVerifyRateLimited,
  issueHealthCardService,
  listHealthCardsService,
  reissueHealthCardService,
  updateHealthCardStatusService,
  verifyHealthCardByTokenService,
  verifyHealthCardPublicService,
} from "@/features/healthcard/services/health-card.service";

async function buildHealthCardQrResponse(card: { verificationToken: string }) {
  const verifyUrl = `${clientEnv.NEXT_PUBLIC_APP_URL}/verify/${card.verificationToken}`;
  const buffer = await QRCode.toBuffer(verifyUrl, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
    },
  });
}

export async function listHealthCardsHandler(request: NextRequest) {
  await requireRole(...ADMIN_ROLES);

  const query = listHealthCardsQuerySchema.parse(
    parseSearchParams(request.url)
  );
  const { items, meta } = await listHealthCardsService(query);

  return successResponse(items, { meta });
}

export async function issueHealthCardHandler(request: NextRequest) {
  const session = await requireRole(...ADMIN_ROLES);

  const body = issueHealthCardSchema.parse(await request.json());
  const card = await issueHealthCardService(session.user.id, body);

  return successResponse(card, { status: 201 });
}

export async function getOwnHealthCardHandler(_request: NextRequest) {
  const session = await requireRole("PATIENT");
  const card = await getOwnHealthCardService(session);
  return successResponse(card);
}

export async function getHealthCardHandler(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();

  const { id } = idParamSchema.parse(await context.params);
  const card = await getHealthCardByIdService(session, id);

  return successResponse(card);
}

const STAFF_VERIFY_RATE_LIMIT = { limit: 60, windowSeconds: 3600 };

export async function verifyHealthCardHandler(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const session = await requireRole(...ADMIN_ROLES, "DOCTOR");

  // Defense in depth: authenticated, but a compromised staff account
  // shouldn't be able to enumerate tokens without limit either.
  const allowed = await checkRateLimit(
    `staff-verify:${session.user.id}`,
    STAFF_VERIFY_RATE_LIMIT.limit,
    STAFF_VERIFY_RATE_LIMIT.windowSeconds
  );
  if (!allowed) {
    throw new ConflictError(
      "Too many verification attempts. Please try again later."
    );
  }

  const { token } = await context.params;
  const card = await verifyHealthCardByTokenService(token);

  return successResponse(card);
}

export async function updateHealthCardStatusHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(...ADMIN_ROLES);

  const { id } = idParamSchema.parse(await context.params);
  const body = updateHealthCardStatusSchema.parse(await request.json());
  const card = await updateHealthCardStatusService(
    session.user.id,
    id,
    body.status
  );

  return successResponse(card);
}

export async function reissueHealthCardHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(...ADMIN_ROLES);

  const { id } = idParamSchema.parse(await context.params);
  const rawBody = await request.text();
  const body = reissueHealthCardSchema.parse(
    rawBody ? JSON.parse(rawBody) : {}
  );
  const card = await reissueHealthCardService(session.user.id, id, body);

  return successResponse(card);
}

export async function publicVerifyHealthCardHandler(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const ip = getClientIp(request.headers);

  if (await isPublicVerifyRateLimited(token, ip)) {
    throw new ConflictError(
      "Too many verification attempts. Please try again later."
    );
  }

  const result = await verifyHealthCardPublicService(token);
  return successResponse(result);
}

export async function getHealthCardQrHandler(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();

  const { id } = idParamSchema.parse(await context.params);
  const card = await getHealthCardByIdService(session, id);

  return buildHealthCardQrResponse(card);
}

export async function getOwnHealthCardQrHandler(_request: NextRequest) {
  const session = await requireRole("PATIENT");
  const card = await getOwnHealthCardService(session);

  return buildHealthCardQrResponse(card);
}
