import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Read ports from the monorepo root .env (prefix "" = load all vars, not just VITE_*).
  const env = loadEnv(mode, fileURLToPath(new URL("../..", import.meta.url)), "");
  const apiPort = Number(env.PORT ?? 3000);
  const webPort = Number(env.WEB_PORT ?? 5173);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      port: webPort,
      // Fail instead of silently picking another port: BETTER_AUTH_URL depends on it.
      strictPort: true,
      // The browser only talks to the Vite origin; Vite forwards /api to Express.
      // Same origin means no CORS and first-party session cookies.
      proxy: { "/api": `http://localhost:${apiPort}` },
    },
  };
});
