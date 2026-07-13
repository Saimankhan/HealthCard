import { NextResponse } from "next/server";

export type ApiMeta = Record<string, unknown>;

export function successResponse<T>(
  data: T,
  options?: { status?: number; meta?: ApiMeta }
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(options?.meta ? { meta: options.meta } : {}),
    },
    { status: options?.status ?? 200 }
  );
}

export function errorResponse(
  message: string,
  status: number,
  code: string,
  details?: unknown
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, ...(details !== undefined ? { details } : {}) },
    },
    { status }
  );
}
