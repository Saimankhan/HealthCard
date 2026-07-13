import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { AppError } from "@/core/api/errors";
import { errorResponse } from "@/core/api/response";

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return errorResponse(
      "Validation failed",
      422,
      "VALIDATION_ERROR",
      error.flatten()
    );
  }

  if (error instanceof AppError) {
    return errorResponse(
      error.message,
      error.status,
      error.code,
      error.details
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return errorResponse(
        "A record with this value already exists",
        409,
        "CONFLICT",
        error.meta
      );
    }
    if (error.code === "P2025") {
      return errorResponse("Record not found", 404, "NOT_FOUND");
    }
    if (error.code === "P2003") {
      return errorResponse(
        "Related record not found",
        400,
        "BAD_REQUEST",
        error.meta
      );
    }
  }

  console.error("Unhandled API error:", error);
  return errorResponse("An unexpected error occurred", 500, "INTERNAL_ERROR");
}

type RouteContext<
  Params extends Record<string, string> = Record<string, string>,
> = {
  params: Promise<Params>;
};

type RouteHandler<
  Params extends Record<string, string> = Record<string, string>,
> = (
  request: NextRequest,
  context: RouteContext<Params>
) => Promise<NextResponse>;

export function withErrorHandling<
  Params extends Record<string, string> = Record<string, string>,
>(handler: RouteHandler<Params>): RouteHandler<Params> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
