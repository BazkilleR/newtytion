// The api's PORT from the monorepo root .env, passed on by scripts/next.js.
const apiPort = Number(process.env.API_PORT ?? 3000);

/** @type {import('next').NextConfig} */
export default {
  // The browser only talks to the Next origin; Next forwards /api to Express.
  // Same origin means no CORS and first-party (SameSite) auth cookies.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `http://localhost:${apiPort}/api/:path*` }];
  },
};
