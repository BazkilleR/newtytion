import { createAuthClient } from "better-auth/react";

// No baseURL: defaults to the current origin + /api/auth, which Vite proxies
// to Express. The session lives in an httpOnly cookie the browser sends itself.
export const authClient = createAuthClient({ basePath: "/api/auth" });

export const { useSession, signIn, signUp, signOut } = authClient;
