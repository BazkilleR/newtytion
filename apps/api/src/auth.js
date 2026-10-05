import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/client.js";
import * as schema from "./db/schema/index.js";
import { env } from "./env.js";

export const auth = betterAuth({
  // Public origin the browser uses (the Vite dev server). Cookies and the
  // CSRF origin check are tied to this, not to Express's own port.
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days: stay logged in on the gym phone
    updateAge: 60 * 60 * 24, // refresh the expiry at most once a day
  },
  trustedOrigins: [env.BETTER_AUTH_URL],
  telemetry: { enabled: false },
});
