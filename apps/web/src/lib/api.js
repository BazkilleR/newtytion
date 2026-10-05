import { apiErrorSchema } from "@fitness/shared";

/** Thrown for any non-2xx response; carries the API's `{ error: { code, message } }`. */
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Small fetch wrapper for the JSON API.
 * @param {string} path e.g. "/meals" (the /api prefix is added here)
 * @param {{ method?: string, body?: unknown, query?: Record<string, unknown>, signal?: AbortSignal }} [options]
 */
export async function api(path, { method = "GET", body, query, signal } = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const qs = params.size ? `?${params}` : "";

  const res = await fetch(`/api${path}${qs}`, {
    method,
    signal,
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = apiErrorSchema.safeParse(data);
    throw parsed.success
      ? new ApiError(res.status, parsed.data.error.code, parsed.data.error.message)
      : new ApiError(res.status, "HTTP_ERROR", res.statusText);
  }
  return data;
}
