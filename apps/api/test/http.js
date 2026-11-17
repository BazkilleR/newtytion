/** Start an app on an ephemeral port; returns its base URL and a close function. */
export async function listen(app) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

/**
 * Tiny JSON client for route tests, optionally logged in with a Cookie header:
 * `await client(url, cookie).post("/api/foods", body)` -> `{ status, body }`.
 */
export function client(baseUrl, cookie) {
  const send = async (method, path, body) => {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(cookie && { cookie }),
        ...(body !== undefined && { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };
  return {
    get: (path) => send("GET", path),
    post: (path, body) => send("POST", path, body),
    put: (path, body) => send("PUT", path, body),
    patch: (path, body) => send("PATCH", path, body),
    delete: (path) => send("DELETE", path),
  };
}
