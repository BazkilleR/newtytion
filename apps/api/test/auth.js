const ORIGIN = process.env.BETTER_AUTH_URL;

let counter = 0;

/**
 * Sign up a fresh user over HTTP (exactly like the browser does) and return
 * the session cookie to send on later requests.
 */
export async function signUp(baseUrl, overrides = {}) {
  counter += 1;
  const body = {
    name: `Test User ${counter}`,
    email: `user${counter}-${Date.now()}@example.com`,
    password: "correct-horse-battery",
    ...overrides,
  };

  const res = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`sign-up failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return { user: data.user, cookie: cookieHeader(res), password: body.password };
}

/** Turn Set-Cookie response headers into a Cookie request header. */
export function cookieHeader(res) {
  return res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}
