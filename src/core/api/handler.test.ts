import { describe, expect, it } from "vitest";
import { ZodError, z } from "zod";

import { handleApiError } from "@/core/api/handler";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/core/api/errors";
import { Prisma } from "@/generated/prisma/client";

async function readJson(response: Response) {
  return response.json() as Promise<{
    success: boolean;
    error: { code: string; message: string; details?: unknown };
  }>;
}

describe("handleApiError", () => {
  it("maps ZodError to a 422 validation error", async () => {
    const schema = z.object({ name: z.string() });
    const result = schema.safeParse({});
    expect(result.success).toBe(false);

    const response = handleApiError(result.error as ZodError);
    expect(response.status).toBe(422);
    const body = await readJson(response);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("maps AppError subclasses to their declared status/code", async () => {
    const notFound = handleApiError(new NotFoundError("Health card"));
    expect(notFound.status).toBe(404);
    expect((await readJson(notFound)).error.code).toBe("NOT_FOUND");

    const forbidden = handleApiError(new ForbiddenError());
    expect(forbidden.status).toBe(403);
    expect((await readJson(forbidden)).error.code).toBe("FORBIDDEN");

    const conflict = handleApiError(
      new ConflictError("Health card is expired")
    );
    expect(conflict.status).toBe(409);
    expect((await readJson(conflict)).error.message).toBe(
      "Health card is expired"
    );
  });

  it("maps Prisma P2002 (unique constraint) to 409 CONFLICT", async () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      { code: "P2002", clientVersion: "test", meta: { target: ["email"] } }
    );
    const response = handleApiError(error);
    expect(response.status).toBe(409);
    expect((await readJson(response)).error.code).toBe("CONFLICT");
  });

  it("maps Prisma P2025 (record not found) to 404 NOT_FOUND", async () => {
    const error = new Prisma.PrismaClientKnownRequestError("Not found", {
      code: "P2025",
      clientVersion: "test",
    });
    const response = handleApiError(error);
    expect(response.status).toBe(404);
    expect((await readJson(response)).error.code).toBe("NOT_FOUND");
  });

  it("falls back to 500 INTERNAL_ERROR for unrecognized errors", async () => {
    const response = handleApiError(new Error("boom"));
    expect(response.status).toBe(500);
    expect((await readJson(response)).error.code).toBe("INTERNAL_ERROR");
  });
});
