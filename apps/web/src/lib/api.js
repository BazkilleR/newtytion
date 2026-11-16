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

let onSessionExpired = () => {};

/** Called when a request is still 401 after trying to refresh, i.e. the user is logged out. */
export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

let refreshing = null;

/** Trade the refresh cookie for new tokens. Requests that 401 together share one call. */
function refreshTokens() {
  refreshing ??= fetch("/api/auth/refresh", { method: "POST" })
    .catch(() => {})
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/**
 * Small fetch wrapper for the JSON API. The tokens are httpOnly cookies the
 * browser sends itself; when the access token has expired (401), it refreshes
 * once and retries.
 * @param {string} path e.g. "/meals" (the /api prefix is added here)
 * @param {{ method?: string, body?: unknown, query?: Record<string, unknown>, signal?: AbortSignal }} [options]
 */
export async function api(path, { method = "GET", body, query, signal } = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const qs = params.size ? `?${params}` : "";

  const send = () =>
    fetch(`/api${path}${qs}`, {
      method,
      signal,
      headers: body !== undefined ? { "content-type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await send();
  // A 401 from /auth/* (e.g. wrong password) is a real answer, not an expired token.
  if (res.status === 401 && !path.startsWith("/auth/")) {
    // Retry even if this refresh failed: another tab may have just rotated the cookies.
    await refreshTokens();
    res = await send();
    if (res.status === 401) onSessionExpired();
  }

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
