export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    message: string,
    code: string,
    status: number,
    details?: unknown
  ) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

type ApiEnvelope<T> =
  | { success: true; data: T; meta?: Record<string, unknown> }
  | {
      success: false;
      error: { code: string; message: string; details?: unknown };
    };

export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const hasBody = options?.body !== undefined;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...options?.headers,
    },
    credentials: "include",
  });

  const json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!res.ok || !json || !json.success) {
    const error = json && !json.success ? json.error : null;
    throw new ApiClientError(
      error?.message ?? "Something went wrong. Please try again.",
      error?.code ?? "UNKNOWN_ERROR",
      res.status,
      error?.details
    );
  }

  return json.data;
}

export async function apiFetchWithMeta<T>(
  url: string,
  options?: RequestInit
): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
    credentials: "include",
  });

  const json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!res.ok || !json || !json.success) {
    const error = json && !json.success ? json.error : null;
    throw new ApiClientError(
      error?.message ?? "Something went wrong. Please try again.",
      error?.code ?? "UNKNOWN_ERROR",
      res.status,
      error?.details
    );
  }

  return { data: json.data, meta: json.meta };
}
