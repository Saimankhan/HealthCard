import type { NextRequest } from "next/server";

import { requireSession } from "@/core/auth/rbac";
import { successResponse } from "@/core/api/response";
import { parseSearchParams } from "@/core/api/pagination";
import { idParamSchema } from "@/core/api/schemas";
import {
  createAppointmentSchema,
  listAppointmentsQuerySchema,
  rescheduleAppointmentSchema,
  updateAppointmentStatusSchema,
} from "@/features/appointments/validation/appointment.validation";
import {
  createAppointmentService,
  getAppointmentByIdService,
  listAppointmentsService,
  rescheduleAppointmentService,
  updateAppointmentStatusService,
} from "@/features/appointments/services/appointment.service";

export async function listAppointmentsHandler(request: NextRequest) {
  const session = await requireSession();

  const query = listAppointmentsQuerySchema.parse(
    parseSearchParams(request.url)
  );
  const { items, meta } = await listAppointmentsService(session, query);

  return successResponse(items, { meta });
}

export async function createAppointmentHandler(request: NextRequest) {
  const session = await requireSession();

  const body = createAppointmentSchema.parse(await request.json());
  const appointment = await createAppointmentService(session, body);

  return successResponse(appointment, { status: 201 });
}

export async function getAppointmentHandler(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();

  const { id } = idParamSchema.parse(await context.params);
  const appointment = await getAppointmentByIdService(session, id);

  return successResponse(appointment);
}

export async function updateAppointmentStatusHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();

  const { id } = idParamSchema.parse(await context.params);
  const body = updateAppointmentStatusSchema.parse(await request.json());
  const appointment = await updateAppointmentStatusService(
    session,
    id,
    body.status
  );

  return successResponse(appointment);
}

export async function rescheduleAppointmentHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();

  const { id } = idParamSchema.parse(await context.params);
  const body = rescheduleAppointmentSchema.parse(await request.json());
  const appointment = await rescheduleAppointmentService(session, id, body);

  return successResponse(appointment);
}
